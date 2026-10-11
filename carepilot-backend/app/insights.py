"""Cross-record insights: trends, comparisons, summary. No risk scores or predictions."""
from . import explain


def lab_records(records):
    return sorted([r for r in records if r.get("results")], key=lambda r: r.get("date") or "")


def trends(records):
    t = {}
    for r in lab_records(records):
        for x in r["results"]:
            if x.get("value") is not None:
                t.setdefault(x["test"], []).append(dict(date=r.get("date"), value=x["value"], unit=x.get("unit"), refLow=x.get("refLow"), refHigh=x.get("refHigh"), status=x.get("status")))
    return t


def compare_last_two(records):
    out = []
    for test, pts in trends(records).items():
        if len(pts) >= 2:
            a, b = pts[-2], pts[-1]
            out.append(dict(test=test, previous=a, latest=b, delta=round(b["value"] - a["value"], 2), direction="up" if b["value"] > a["value"] else "down" if b["value"] < a["value"] else "same"))
    return out


def summary(records):
    labs = lab_records(records)
    latest = {}
    for r in labs:
        for x in r["results"]:
            latest[x["test"]] = dict(x, date=r.get("date"))
    review = [x for x in latest.values() if x["status"] in ("low", "high")]
    verify = [x for x in latest.values() if x["status"] == "needs_verification"]
    qs = []
    for x in review:
        for q in explain.explain_result(x)["questions"]:
            if q not in qs:
                qs.append(q)
    return dict(totals=dict(records=len(records), analyzed=sum(1 for r in records if r.get("status") in ("analyzed", "needs_review")), toReview=len(review)),
                discussWithDoctor=review, needsVerification=verify, changes=compare_last_two(records), trends=trends(records),
                doctorQuestions=qs, disclaimer=explain.DISCLAIMER)
