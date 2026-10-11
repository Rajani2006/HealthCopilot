# CarePilot AI: FastAPI backend

Backend for the CarePilot React UI: upload, OCR, extraction, plain-language explanations, timeline, summary, assistant, FHIR export.

## Run
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# OCR engine (Ubuntu/Debian). Add language packs for regional scans:
sudo apt install tesseract-ocr tesseract-ocr-tel tesseract-ocr-hin tesseract-ocr-tam
cp .env.example .env            # set OCR_LANGS=eng+tel for Telugu, optional ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```
Docs: http://localhost:8000/docs. In the React app set `VITE_API_BASE_URL=http://localhost:8000`.

## Endpoints (match the UI service layer)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/records/upload` | multipart: `file`, `record_type` (lab_report, prescription, discharge_summary, diagnostic_report), `consent=true` |
| POST | `/api/analysis/report` | `{record_id, language}` runs OCR, extraction, explanations |
| PATCH | `/api/records/{id}/results` | user corrections; status and explanations recomputed |
| GET | `/api/records?search=&type=&sort=` | list; `GET/DELETE /api/records/{id}`, `GET /api/records/{id}/file` (original) |
| POST | `/api/analysis/medicine-image` | multipart `file`; image is not retained |
| GET | `/api/health/timeline`, `/api/health/summary` | events; trends, changes, doctor questions |
| POST | `/api/assistant/chat` | `{message, record_id?, language}` |
| POST | `/api/abha/link` | MOCK ABHA link (14 digits) |
| GET | `/api/export/fhir`, `/api/export/records` | FHIR R4 Bundle; JSON download |

Result shape: `{test, value, unit, refLow, refHigh, confidence, loinc, rangeSource, status, critical, edited}` where `status` is `normal | high | low | needs_verification`.

## Design decisions
- **PDF text layer first** (exact), Tesseract only for scans and photos. Low OCR confidence gives `needs_verification`, never a green badge.
- **Reference range from the report wins**; otherwise a general adult default is used and labelled `general-default`.
- **No diagnosis, no medicine advice**; every explanation carries possibilities wording and a professional-care next step. Critical flags are conservative "contact a doctor" prompts.
- **Medicine scanner** only reports text read from the package and a small built-in list; it never identifies from appearance. Extend `REF` in `app/medicine.py` or plug in a real drug database.
- **LLM optional**: with `ANTHROPIC_API_KEY` the summary, chat and translations (te/hi/ta) use the model, sending only test names and values. Without it, rule-based English answers are returned and say translation is unavailable.
- **Privacy**: files are stored in `uploads/` and served only through `/api/records/{id}/file`; record contents are never logged.

## Known limits (be upfront in your demo)
- No authentication or multi-user separation (single demo user). Add OAuth/JWT and per-user DB before real use.
- Handwritten prescriptions are not reliably read by Tesseract; use a vision model for those.
- Extraction is regex-based: it handles one-test-per-line reports. Tabular layouts need a layout-aware parser or an LLM extraction step.
- The ABHA link is a mock and does not talk to ABDM.
