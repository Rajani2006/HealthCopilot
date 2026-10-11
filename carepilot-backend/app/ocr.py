"""OCR layer: PDF text layer first (exact), Tesseract fallback for scans/photos."""
import io, os
from fastapi import HTTPException

LANGS = os.getenv("OCR_LANGS", "eng")


def _tesseract_image(img):
    try:
        import pytesseract
        from PIL import ImageOps
    except ImportError:
        raise HTTPException(503, "OCR dependencies missing. pip install pytesseract pillow")
    img = ImageOps.autocontrast(ImageOps.grayscale(img))
    try:
        d = pytesseract.image_to_data(img, lang=LANGS, output_type=pytesseract.Output.DICT)
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(503, "Tesseract is not installed on the server.")
    confs = []
    for t, c in zip(d["text"], d["conf"]):
        if t.strip():
            try:
                if float(c) >= 0:
                    confs.append(float(c))
            except ValueError:
                pass
    text = pytesseract.image_to_string(img, lang=LANGS)
    conf = (sum(confs) / len(confs) / 100) if confs else 0.0
    return text, round(conf, 2)


def extract_text(path: str, kind: str):
    """Returns (text, engine, confidence 0-1). Unreadable files raise HTTP 422."""
    try:
        return _extract(path, kind)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Could not read this file. It may be corrupt or password-protected.")


def _extract(path, kind):
    from PIL import Image
    if kind == "pdf":
        import fitz
        doc = fitz.open(path)
        text = "\n".join(p.get_text() for p in doc)
        if len(text.strip()) >= 30:
            return text, "pdf-text-layer", 0.98
        parts, confs = [], []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            t, c = _tesseract_image(Image.open(io.BytesIO(pix.tobytes("png"))))
            parts.append(t); confs.append(c)
        return "\n".join(parts), "tesseract", round(sum(confs) / max(len(confs), 1), 2)
    t, c = _tesseract_image(Image.open(path))
    return t, "tesseract", c
