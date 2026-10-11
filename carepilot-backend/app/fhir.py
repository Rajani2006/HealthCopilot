"""Build a FHIR R4 Bundle (ABDM-style resources) from stored records."""
OBS_CODE = {"L": "L", "H": "H", "N": "N"}


def bundle(records, abha=None):
    pid = "patient-1"
    entries = [{"resource": {"resourceType": "Patient", "id": pid,
                             "identifier": [{"system": "https://healthid.abdm.gov.in", "value": abha}] if abha else [],
                             "name": [{"text": "Demo Patient"}]}}]
    for r in records:
        d = r.get("date")
        entries.append({"resource": {"resourceType": "Composition", "id": "c-" + r["id"], "status": "final", "type": {"text": r.get("type")}, "subject": {"reference": f"Patient/{pid}"}, "date": d, "title": r.get("type")}})
        for x in r.get("results", []):
            if x.get("value") is None:
                continue
            code = {"low": "L", "high": "H", "normal": "N"}.get(x["status"])
            obs = {"resourceType": "Observation", "status": "final", "subject": {"reference": f"Patient/{pid}"}, "effectiveDateTime": d,
                   "code": {"coding": [{"system": "http://loinc.org", "code": x.get("loinc"), "display": x["test"]}], "text": x["test"]},
                   "valueQuantity": {"value": x["value"], "unit": x.get("unit")}}
            if x.get("refLow") is not None and x.get("refHigh") is not None:
                obs["referenceRange"] = [{"low": {"value": x["refLow"]}, "high": {"value": x["refHigh"]}}]
            if code:
                obs["interpretation"] = [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": code}]}]
            entries.append({"resource": obs})
        for m in r.get("medicines", []):
            entries.append({"resource": {"resourceType": "MedicationRequest", "status": "unknown", "intent": "order", "subject": {"reference": f"Patient/{pid}"}, "authoredOn": d,
                                         "medicationCodeableConcept": {"text": m["name"]},
                                         "dosageInstruction": [{"text": f"{m['dose']} {m.get('frequency') or ''} {str(m['days']) + ' days' if m.get('days') else ''}".strip()}]}})
        if r.get("diagnosis"):
            entries.append({"resource": {"resourceType": "Condition", "subject": {"reference": f"Patient/{pid}"}, "recordedDate": d, "code": {"text": r["diagnosis"]}}})
    return {"resourceType": "Bundle", "type": "collection", "entry": entries}
