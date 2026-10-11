"""Report Q&A. LLM if configured, otherwise safe rule-based answers grounded in stored values."""
from . import explain, insights, llm


def _ctx(rec):
    return "\n".join(f"{r['test']}: {r['value']} {r['unit']} (range {r['refLow']}-{r['refHigh']}, {r['status']})" for r in (rec or {}).get("results", []))


async def answer(message, rec, records, language="en"):
    if rec is None:
        labs = insights.lab_records(records)
        rec = labs[-1] if labs else None
    if llm.enabled():
        ctx = _ctx(rec) if rec else ""
        user_prompt = f"Report data (values only):\n{ctx}\n\nPatient question: {message}" if ctx else f"Patient question: {message}"
        t = await llm.complete(user_prompt, language)
        if t:
            return dict(reply=t, source="llm", disclaimer=explain.DISCLAIMER)
    m = message.lower()
    note = "" if language == "en" else "(Translation service not connected; showing English.)\n"
    if not rec:
        ans = dict(reply=note + "I don't have an analysed report yet. Upload and analyse one first.", source="rules", disclaimer=explain.DISCLAIMER)
        diag = llm.get_diagnostic()
        if diag and diag != "OK":
            ans["diagnostic"] = diag
        return ans
    res = rec["results"]
    if "compare" in m or "previous" in m or "last two" in m:
        ch = insights.compare_last_two(records)
        text = "\n".join(f"- {c['test']}: {c['previous']['value']} -> {c['latest']['value']} {c['latest']['unit']} ({c['direction']})" for c in ch) or "I need at least two reports with the same tests to compare."
        text = "What the reports say:\n" + text
    elif "doctor" in m or "discuss" in m:
        qs = insights.summary(records)["doctorQuestions"]
        text = "Questions you could ask a healthcare professional:\n" + "\n".join(f"- {q}" for q in qs) if qs else "No out-of-range values were found; you can still share the report at your next visit."
    else:
        ex = explain.explain_all(res)
        lines = [f"- {e['test']}: {e['comparison']} {e['measures']}" for e in ex if e["status"] != "normal"] or ["All readable values are within the supplied range."]
        text = "What the report says:\n" + "\n".join(lines) + "\n\nThese values have several possible explanations; only a clinician can interpret them in context."
    ans = dict(reply=note + text + "\n\nPlease discuss with a qualified healthcare professional.", source="rules", disclaimer=explain.DISCLAIMER)
    diag = llm.get_diagnostic()
    if diag and diag != "OK":
        ans["diagnostic"] = diag
    return ans
