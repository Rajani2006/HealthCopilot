"""Rule-based extraction of lab values, medicines, diagnosis and date from OCR text."""
import re
from datetime import date

TESTS = [  # order matters: HbA1c before Hemoglobin
    dict(name="HbA1c", rx=r"hba1c|glycos?ylated\s+h(?:a)?emoglobin", unit="%", lo=4.0, hi=5.6, loinc="4548-4"),
    dict(name="Hemoglobin", rx=r"\bh(?:a)?emoglobin\b|\bhb\b", unit="g/dL", lo=12.0, hi=17.0, loinc="718-7", crit_lo=7.0),
    dict(name="Fasting Glucose", rx=r"(?:fasting\s+)?(?:blood\s+)?(?:glucose|sugar)|\bfbs\b", unit="mg/dL", lo=70, hi=100, loinc="1558-6", crit_lo=54, crit_hi=300),
    dict(name="Total Cholesterol", rx=r"total\s+cholesterol", unit="mg/dL", lo=0, hi=200, loinc="2093-3"),
    dict(name="LDL Cholesterol", rx=r"\bldl\b", unit="mg/dL", lo=0, hi=100, loinc="13457-7"),
    dict(name="HDL Cholesterol", rx=r"\bhdl\b", unit="mg/dL", lo=40, hi=200, loinc="2085-9"),
    dict(name="Triglycerides", rx=r"triglycerides?", unit="mg/dL", lo=0, hi=150, loinc="2571-8"),
    dict(name="Creatinine", rx=r"creatinine", unit="mg/dL", lo=0.6, hi=1.3, loinc="2160-0", crit_hi=4.0),
    dict(name="TSH", rx=r"\btsh\b", unit="uIU/mL", lo=0.4, hi=4.0, loinc="3016-3"),
    dict(name="Vitamin D", rx=r"vitamin\s*d", unit="ng/mL", lo=30, hi=100, loinc="1989-3"),
]
BY_NAME = {t["name"]: t for t in TESTS}
NUM = r"(\d+(?:\.\d+)?)"
MEDRX = re.compile(r"\b(?:tab|cap|syp|inj)\.?\s+([A-Za-z][A-Za-z\-]+)\s+(\d+(?:\.\d+)?\s?(?:mg|mcg|ml|g))\s*(\d-\d-\d)?\s*(?:[x×]\s*(\d+)\s*days?)?", re.I)
MONTHS = {m: i for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split(), 1)}


def classify(value, lo, hi, conf):
    if value is None or lo is None or hi is None or conf < 0.6:
        return "needs_verification"
    return "low" if value < lo else "high" if value > hi else "normal"


def is_critical(test, value):
    t = BY_NAME.get(test)
    if not t or value is None:
        return False
    return (t.get("crit_lo") is not None and value < t["crit_lo"]) or (t.get("crit_hi") is not None and value > t["crit_hi"])


def build_result(test, value, unit, lo, hi, conf, range_source):
    return dict(test=test, value=value, unit=unit, refLow=lo, refHigh=hi, confidence=round(conf, 2),
                loinc=BY_NAME.get(test, {}).get("loinc"), rangeSource=range_source,
                status=classify(value, lo, hi, conf), critical=is_critical(test, value), edited=False)


def parse_date(text):
    cands = []
    for m in re.finditer(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})", text):
        n1, n2, y = int(m[1]), int(m[2]), int(m[3])
        if 1 <= n2 <= 12 and 1 <= n1 <= 31:
            cands.append((y, n2, n1))
        if 1 <= n1 <= 12 and 1 <= n2 <= 31:
            cands.append((y, n1, n2))
    for m in re.finditer(r"(\d{4})-(\d{2})-(\d{2})", text):
        cands.append((int(m[1]), int(m[2]), int(m[3])))
    for m in re.finditer(r"(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})", text):
        if m[2].lower() in MONTHS:
            cands.append((int(m[3]), MONTHS[m[2].lower()], int(m[1])))
    for y, mo, d in cands:
        try:
            return date(y, mo, d).isoformat()
        except ValueError:
            continue
    return None


def extract(text, ocr_conf=0.9):
    results, meds, dx = [], [], None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        m = re.match(r"(?:diagnosis|dx|impression)\s*[:\-]\s*(.+)", line, re.I)
        if m:
            dx = m[1].strip()
            continue
        mm = MEDRX.search(line)
        if mm:
            meds.append(dict(name=mm[1], dose=mm[2], frequency=mm[3] or "", days=int(mm[4]) if mm[4] else None, confidence=round(ocr_conf, 2)))
            continue
        for t in TESTS:
            hit = re.search(t["rx"], line, re.I)
            if not hit:
                continue
            rest = line[hit.end():]
            n = re.search(NUM, rest)
            if not n:
                break
            value = float(n[1])
            tail = rest[n.end():]
            u = re.match(r"\s*([A-Za-zµ%][A-Za-z0-9µ%/]*)", tail)
            unit = u[1] if u else t["unit"]
            rg = re.search(NUM + r"\s*(?:-|–|to)\s*" + NUM, tail)
            if rg and float(rg[1]) < float(rg[2]):
                lo, hi, src = float(rg[1]), float(rg[2]), "report"
            else:
                lo, hi, src = t["lo"], t["hi"], "general-default"
            results.append(build_result(t["name"], value, unit, lo, hi, ocr_conf, src))
            break
    return dict(results=results, medicines=meds, diagnosis=dx, date=parse_date(text))
