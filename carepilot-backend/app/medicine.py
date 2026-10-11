"""Medicine image reading. We only report text actually read from the package and match it against a small built-in list.
No identification from appearance, no dosage advice."""
import re
from difflib import get_close_matches

REF = {  # name -> (active ingredient, form, kind)
    "metformin": ("Metformin hydrochloride", "Tablet", "generic"), "glycomet": ("Metformin hydrochloride", "Tablet", "brand"),
    "atorvastatin": ("Atorvastatin calcium", "Tablet", "generic"), "paracetamol": ("Paracetamol", "Tablet", "generic"),
    "dolo": ("Paracetamol", "Tablet", "brand"), "crocin": ("Paracetamol", "Tablet", "brand"),
    "amlodipine": ("Amlodipine besylate", "Tablet", "generic"), "telmisartan": ("Telmisartan", "Tablet", "generic"),
    "losartan": ("Losartan potassium", "Tablet", "generic"), "pantoprazole": ("Pantoprazole sodium", "Tablet", "generic"),
    "omeprazole": ("Omeprazole", "Capsule", "generic"), "azithromycin": ("Azithromycin", "Tablet", "generic"),
    "amoxicillin": ("Amoxicillin", "Capsule", "generic"), "cetirizine": ("Cetirizine hydrochloride", "Tablet", "generic"),
    "levothyroxine": ("Levothyroxine sodium", "Tablet", "generic"), "thyronorm": ("Levothyroxine sodium", "Tablet", "brand"),
    "glimepiride": ("Glimepiride", "Tablet", "generic"), "ibuprofen": ("Ibuprofen", "Tablet", "generic"),
    "ondansetron": ("Ondansetron", "Tablet", "generic"), "aspirin": ("Aspirin", "Tablet", "generic"),
}
FORMS = {"tablet": "Tablet", "tablets": "Tablet", "capsule": "Capsule", "capsules": "Capsule", "syrup": "Syrup", "injection": "Injection", "suspension": "Suspension"}


def analyze(text, ocr_conf):
    tokens = re.findall(r"[a-z]{4,}", text.lower())
    match, ratio = None, 0.0
    for t in tokens:
        hit = get_close_matches(t, REF.keys(), n=1, cutoff=0.82)
        if hit:
            from difflib import SequenceMatcher
            r = SequenceMatcher(None, t, hit[0]).ratio()
            if r > ratio:
                match, ratio = hit[0], r
    strength = re.search(r"\b(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|iu)\b", text, re.I)
    exp = re.search(r"exp(?:iry|\.)?(?:\s*date)?\s*[:\-]?\s*(\d{1,2}[/\-]\d{2,4}|[A-Za-z]{3}[a-z]*\.?\s*\d{2,4})", text, re.I)
    form = next((v for k, v in FORMS.items() if k in text.lower()), None)
    conf = round(min(ocr_conf, 1.0) * ratio, 2) if match else 0.0
    if not match or conf < 0.55:
        return dict(status="unable_to_identify", message="Unable to identify confidently. Please retake a clearer, well-lit photo or enter the name manually.",
                    readText=dict(strength=strength.group(0) if strength else None, expiry=exp.group(1) if exp else None, form=form),
                    confidence=conf, source="OCR of the image only", verifyNote=VERIFY)
    ing, ref_form, kind = REF[match]
    return dict(status="candidate", possibleName=match.title(), nameType=kind, strength=strength.group(0) if strength else None,
                dosageForm=form or ref_form, expiry=exp.group(1) if exp else None,
                activeIngredient=ing, confidence=conf, source="OCR text matched to built-in reference list", verifyNote=VERIFY)


VERIFY = "Verify with the package, your prescription or a pharmacist. No dosage advice is given here."
