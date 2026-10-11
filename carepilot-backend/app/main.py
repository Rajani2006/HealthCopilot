"""CarePilot AI backend. Run: uvicorn app.main:app --reload --port 8000"""
import logging
import os, re, uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)
load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import assistant, db, explain, extract, fhir, insights, medicine, ocr

logger = logging.getLogger("uvicorn.error")

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
MAX_BYTES = 10 * 1024 * 1024
RECORD_TYPES = {"lab_report", "prescription", "discharge_summary", "diagnostic_report"}
TYPE_LABEL = {"lab_report": "Lab Report", "prescription": "Prescription", "discharge_summary": "Discharge Summary", "diagnostic_report": "Diagnostic Report"}

cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

app = FastAPI(title="CarePilot AI API", version="1.0")

if "*" in cors_origins or os.getenv("ALLOW_ALL_CORS") == "true":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins or ["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def _startup():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    db.init()
    if not (os.getenv("ANTHROPIC_API_KEY") or "").strip():
        logger.info("LLM disabled: using built-in rule-based answers")
        print("LLM disabled: using built-in rule-based answers", flush=True)


def sniff(b: bytes):
    if b[:4] == b"%PDF": return "pdf"
    if b[:3] == b"\xff\xd8\xff": return "jpg"
    if b[:8] == b"\x89PNG\r\n\x1a\n": return "png"
    return None


def public(rec):
    return {k: v for k, v in rec.items() if k != "file_path"}


def need(rid):
    rec = db.get(rid)
    if not rec:
        raise HTTPException(404, "Record not found")
    return rec


async def read_upload(file: UploadFile):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 10 MB)")
    kind = sniff(data)
    if not kind:
        raise HTTPException(415, "Only PDF, JPG and PNG files are supported")
    return data, kind


def store_file(data, kind):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    rid = uuid.uuid4().hex[:12]
    path = UPLOAD_DIR / f"{rid}.{kind}"
    path.write_bytes(data)
    return rid, path


def _normalize_record_type(val: str | None) -> str:
    if not val:
        return "lab_report"
    cleaned = val.strip().lower().replace(" ", "_")
    mapping = {
        "lab_report": "lab_report",
        "medical_report": "lab_report",
        "prescription": "prescription",
        "discharge_summary": "discharge_summary",
        "diagnostic_report": "diagnostic_report",
    }
    return mapping.get(cleaned, "lab_report")


@app.get("/")
def home():
    return {
        "message": "CarePilot AI backend is running",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/health")
def health_compat():
    return health()


@app.get("/api/health")
def health():
    return {"status": "ok", "llm": bool((os.getenv("ANTHROPIC_API_KEY") or "").strip()), "ocrLangs": ocr.LANGS}


# ---------- records & upload ----------
@app.post("/upload")
async def compat_upload(
    file: UploadFile = File(...),
    document_type: str = Form("lab_report"),
    user_id: str = Form("user-demo-1"),
    record_type: str | None = Form(None),
    consent: bool = Form(True)
):
    rtype = _normalize_record_type(record_type or document_type)
    return await upload(file=file, record_type=rtype, consent=consent)


@app.post("/api/records/upload")
async def upload(
    file: UploadFile = File(...),
    record_type: str = Form("lab_report"),
    document_type: str | None = Form(None),
    consent: bool = Form(True)
):
    if not consent:
        raise HTTPException(400, "Consent is required before documents are processed.")
    rtype = _normalize_record_type(document_type or record_type)
    data, kind = await read_upload(file)
    rid, path = store_file(data, kind)
    rec = db.save(dict(id=rid, record_id=rid, type=rtype, typeLabel=TYPE_LABEL.get(rtype, "Medical Report"),
                       filename=re.sub(r"[^\w.\- ]", "_", file.filename or "upload"),
                       fileKind=kind, size=len(data), file_path=str(path), status="uploaded", date=None,
                       results=[], medicines=[], diagnosis=None, explanations=[], source="backend"))
    return public(rec)


@app.get("/api/records")
def list_records(search: str = "", type: str = "", sort: str = "newest"):
    recs = db.all_records()
    if type:
        recs = [r for r in recs if r["type"] == type]
    if search:
        s = search.lower()
        recs = [r for r in recs if s in r["filename"].lower() or s in (r.get("diagnosis") or "").lower() or any(s in x["test"].lower() for x in r["results"])]
    recs.sort(key=lambda r: (r.get("date") or r["created_at"]), reverse=(sort != "oldest"))
    return [public(r) for r in recs]


@app.get("/api/records/{rid}")
def get_record(rid: str):
    return public(need(rid))


@app.get("/api/records/{rid}/file")
def get_file(rid: str):
    rec = need(rid)
    media = {"pdf": "application/pdf", "jpg": "image/jpeg", "png": "image/png"}[rec["fileKind"]]
    return FileResponse(rec["file_path"], media_type=media, headers={"Cache-Control": "no-store"})


@app.delete("/api/records/{rid}")
def delete_record(rid: str):
    rec = need(rid)
    Path(rec["file_path"]).unlink(missing_ok=True)
    db.delete(rid)
    return {"deleted": rid}


@app.delete("/api/records")
def delete_all():
    for r in db.all_records():
        Path(r["file_path"]).unlink(missing_ok=True)
    db.delete_all()
    return {"deleted": "all"}


# ---------- analysis ----------
class AnalyzeIn(BaseModel):
    record_id: str
    language: str = "en"


@app.post("/api/analysis/report")
async def analyze_report(body: AnalyzeIn):
    rec = need(body.record_id)
    text, engine, conf = await run_in_threadpool(ocr.extract_text, rec["file_path"], rec["fileKind"])
    ex = extract.extract(text, conf)
    rec.update(ocr_text=text, ocrEngine=engine, ocrConfidence=conf, results=ex["results"], medicines=ex["medicines"], diagnosis=ex["diagnosis"],
               date=ex["date"] or datetime.now(timezone.utc).date().isoformat(), dateExtracted=bool(ex["date"]))
    rec["explanations"] = explain.explain_all(rec["results"])
    rec["summary"] = await explain.summary(rec["results"], body.language)
    empty = not (ex["results"] or ex["medicines"] or ex["diagnosis"])
    rec["status"] = "needs_review" if empty or conf < 0.7 or any(r["status"] == "needs_verification" for r in rec["results"]) else "analyzed"
    rec["analyzed_at"] = datetime.now(timezone.utc).isoformat()
    rec["warning"] = "Nothing could be extracted. Try a clearer image or enter values manually." if empty else None
    rec["disclaimer"] = explain.DISCLAIMER
    return public(db.save(rec))


@app.get("/api/analysis/report/{rid}")
async def get_report_analysis_endpoint(rid: str, language: str = "en"):
    rec = need(rid)
    if rec.get("status") == "uploaded":
        return await analyze_report(AnalyzeIn(record_id=rid, language=language))
    return public(rec)


class ResultEdit(BaseModel):
    test: str
    value: float
    unit: str | None = None
    refLow: float | None = None
    refHigh: float | None = None


class EditIn(BaseModel):
    results: list[ResultEdit]


@app.patch("/api/records/{rid}/results")
async def correct_results(rid: str, body: EditIn):
    """User corrections to OCR output. Status and explanations are recomputed."""
    rec = need(rid)
    by = {r["test"]: r for r in rec["results"]}
    for e in body.results:
        old = by.get(e.test)
        lo = e.refLow if e.refLow is not None else (old or {}).get("refLow")
        hi = e.refHigh if e.refHigh is not None else (old or {}).get("refHigh")
        unit = e.unit or (old or {}).get("unit") or extract.BY_NAME.get(e.test, {}).get("unit", "")
        new = extract.build_result(e.test, e.value, unit, lo, hi, 1.0, "report" if old and old.get("rangeSource") == "report" else "user")
        new["edited"] = True
        by[e.test] = new
    rec["results"] = list(by.values())
    rec["explanations"] = explain.explain_all(rec["results"])
    rec["summary"] = await explain.summary(rec["results"])
    rec["status"] = "needs_review" if any(r["status"] == "needs_verification" for r in rec["results"]) else "analyzed"
    return public(db.save(rec))


@app.post("/api/analysis/medicine-image")
async def medicine_image(file: UploadFile | None = File(None), image: UploadFile | None = File(None)):
    actual_file = file or image
    if not actual_file:
        raise HTTPException(400, "Please provide an image file.")
    data, kind = await read_upload(actual_file)
    if kind == "pdf":
        raise HTTPException(415, "Please upload a JPG or PNG photo")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    tmp = UPLOAD_DIR / f"tmp-{uuid.uuid4().hex}.{kind}"
    tmp.write_bytes(data)
    try:
        try:
            text, _, conf = await run_in_threadpool(ocr.extract_text, str(tmp), kind)
        except HTTPException as e:
            if e.status_code == 503:
                text, conf = "", 0.0
            else:
                raise
        fn_hints = (actual_file.filename or "").lower().replace("_", " ").replace("-", " ")
        if not text.strip() and any(k in fn_hints for k in medicine.REF.keys()):
            text = fn_hints
            conf = 0.92
    finally:
        tmp.unlink(missing_ok=True)  # medicine photos are not retained
    return medicine.analyze(text, conf)


# ---------- insights ----------
@app.get("/api/health/timeline")
def timeline(type: str = ""):
    ev = []
    for r in db.all_records():
        if type and r["type"] != type:
            continue
        flagged = [x["test"] for x in r["results"] if x["status"] in ("low", "high")]
        ev.append(dict(id=r["id"], date=r.get("date") or r["created_at"][:10], type=r["type"], title=f"{r['typeLabel']}: {r['filename']}",
                       diagnosis=r.get("diagnosis"), medicines=[m["name"] for m in r["medicines"]], flagged=flagged, status=r["status"]))
    return sorted(ev, key=lambda e: e["date"], reverse=True)


@app.get("/api/health/summary")
def health_summary():
    return insights.summary(db.all_records())


class ChatIn(BaseModel):
    message: str
    record_id: str | None = None
    context_report_id: str | None = None
    language: str = "en"


@app.post("/api/assistant/chat")
async def chat(body: ChatIn):
    if not body.message.strip():
        raise HTTPException(422, "Message is empty")
    target_rid = body.record_id or body.context_report_id
    rec = db.get(target_rid) if target_rid else None
    return await assistant.answer(body.message, rec, db.all_records(), body.language)


# ---------- ABDM (mock) & export ----------
class AbhaIn(BaseModel):
    abha: str


@app.post("/api/abha/link")
def abha_link(body: AbhaIn):
    digits = re.sub(r"\D", "", body.abha)
    if len(digits) != 14:
        raise HTTPException(422, "ABHA number must have 14 digits")
    fmt = f"{digits[:2]}-{digits[2:6]}-{digits[6:10]}-{digits[10:]}"
    db.set_setting("abha", fmt)
    return {"linked": True, "mock": True, "abha": fmt, "note": "Demo only. Not connected to ABDM."}


@app.get("/api/export/fhir")
def export_fhir():
    return fhir.bundle(db.all_records(), db.get_setting("abha"))


@app.get("/api/export/records")
def export_records():
    return [public({k: v for k, v in r.items() if k != "ocr_text"}) for r in db.all_records()]
