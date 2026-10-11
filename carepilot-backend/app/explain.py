"""Plain-language explanations. Template-based (always available); LLM adds a narrative summary when configured."""
from . import llm

DISCLAIMER = "Informational only. Not a diagnosis or a substitute for professional medical advice."
KB = {
 "Hemoglobin": dict(m="Hemoglobin is the protein in red blood cells that carries oxygen.", lo=["Iron, vitamin B12 or folate deficiency", "Blood loss or chronic conditions"], hi=["Dehydration", "Living at high altitude or smoking"], f=["Hydration", "Recent illness", "Pregnancy"], q=["What could explain this hemoglobin level for me?", "Do I need follow-up tests?"]),
 "HbA1c": dict(m="HbA1c reflects your average blood sugar over roughly the last 2-3 months.", lo=["Recent blood loss or certain anaemias can alter it"], hi=["Blood sugar has been running above the reference range"], f=["Anaemia", "Some haemoglobin variants", "Recent transfusion"], q=["Is this consistent with my other sugar readings?", "How often should this be re-checked?"]),
 "Fasting Glucose": dict(m="Fasting glucose is blood sugar measured after at least 8 hours without food.", lo=["Prolonged fasting or certain medicines"], hi=["Sugar control may be above range, or the sample may not have been truly fasting"], f=["Whether you really fasted", "Stress or illness", "Medicines"], q=["Should this test be repeated?", "Does my HbA1c agree with this?"]),
 "Total Cholesterol": dict(m="Total cholesterol is the overall amount of cholesterol in your blood.", lo=["Diet, genetics or other conditions"], hi=["Diet, genetics, thyroid or other conditions"], f=["Fasting state", "Recent illness"], q=["What does the full lipid profile say together?"]),
 "LDL Cholesterol": dict(m="LDL is often called 'bad' cholesterol; higher levels are linked with heart and artery risk over time.", lo=["Usually not a concern on its own"], hi=["Diet, genetics, thyroid or other conditions"], f=["Fasting state", "Medicines"], q=["What LDL target is right for me?", "Is lifestyle change or other care needed?"]),
 "HDL Cholesterol": dict(m="HDL is often called 'good' cholesterol.", lo=["Low activity, smoking or genetics"], hi=["Usually not a concern on its own"], f=["Exercise", "Alcohol"], q=["How does my HDL fit with the rest of my lipid profile?"]),
 "Triglycerides": dict(m="Triglycerides are a type of fat in the blood.", lo=["Usually not a concern on its own"], hi=["Recent meal, alcohol, diet or sugar control"], f=["Fasting state", "Alcohol"], q=["Should I repeat this fasting?"]),
 "Creatinine": dict(m="Creatinine is a waste product filtered by the kidneys; it helps assess kidney function.", lo=["Low muscle mass"], hi=["Dehydration, kidney function changes, high muscle mass or some medicines"], f=["Hydration", "Muscle mass", "Meat intake", "Medicines"], q=["Do I need a kidney function follow-up?"]),
 "TSH": dict(m="TSH is a pituitary hormone that signals the thyroid; it helps check thyroid function.", lo=["An over-active thyroid or thyroid medicine effects"], hi=["An under-active thyroid or recent illness"], f=["Time of day", "Biotin supplements", "Illness"], q=["Do I need free T3/T4 tests or a repeat?"]),
 "Vitamin D": dict(m="This measures vitamin D stores, which matter for bones and muscles.", lo=["Low sun exposure or low dietary intake"], hi=["Supplement excess"], f=["Season", "Supplements"], q=["Do I need supplements, and how will levels be monitored?"]),
}
NEXT = "Discuss this result with a qualified healthcare professional."
URGENT = "This value looks far outside the usual range. Contact a doctor promptly, or emergency services if you feel unwell."


def explain_result(r):
    kb = KB.get(r["test"], dict(m="This test is part of your report.", lo=[], hi=[], f=[], q=["What does this result mean for me?"]))
    v, lo, hi, u = r.get("value"), r.get("refLow"), r.get("refHigh"), r.get("unit") or ""
    st = r["status"]
    if st == "needs_verification":
        comp = f"The value ({v} {u}) or its reference range could not be read confidently. Please verify it against the original report."
    else:
        rel = {"low": "below", "high": "above", "normal": "within"}[st]
        src = "from your report" if r.get("rangeSource") == "report" else "a general adult default, not your lab's"
        comp = f"Your value {v} {u} is {rel} the reference range {lo}-{hi} {u} ({src})."
    return dict(test=r["test"], status=st, measures=kb["m"], comparison=comp,
                possibilities=kb.get(st if st in ("lo", "hi") else {"low": "lo", "high": "hi"}.get(st, ""), []),
                possibilitiesNote="These are possibilities, not a diagnosis.",
                factors=kb["f"], questions=kb["q"], nextStep=NEXT, urgent=bool(r.get("critical")),
                urgentMessage=URGENT if r.get("critical") else None,
                tags=dict(value="OCR-extracted fact" if not r.get("edited") else "Edited by you", explanation="Template explanation"))


def explain_all(results):
    return [explain_result(r) for r in results]


def template_summary(results):
    if not results:
        return "No lab values could be extracted. Please review the document or enter values manually."
    out = [r for r in results if r["status"] in ("low", "high")]
    nv = [r for r in results if r["status"] == "needs_verification"]
    s = f"{len(results)} values were extracted. "
    s += (f"{len(out)} outside the reference range: " + ", ".join(f"{r['test']} ({r['value']} {r['unit']}, {r['status']})" for r in out) + ". ") if out else "All readable values are within the supplied reference range. "
    if nv:
        s += f"{len(nv)} need verification. "
    return s + "Please discuss the results with a qualified healthcare professional."


async def summary(results, language="en"):
    if llm.enabled() and results:
        facts = "\n".join(f"{r['test']}: {r['value']} {r['unit']} (range {r['refLow']}-{r['refHigh']}, {r['status']})" for r in results)
        t = await llm.complete(f"Summarise these lab results in 4-6 plain sentences for a patient:\n{facts}", language)
        if t:
            return dict(text=t, source="llm", language=language)
    return dict(text=template_summary(results), source="template", language="en", translated=language == "en")
