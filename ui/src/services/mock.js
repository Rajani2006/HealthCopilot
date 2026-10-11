// CarePilot AI — High Fidelity Mock Engine & FHIR Generator
import {
  initialPatientProfile,
  initialRecords,
  defaultAnalysisReport,
  defaultPrescription,
  initialTimelineEvents,
  hba1cTrendData,
  hemoglobinTrendData,
  initialFollowUps
} from '../data/mockData';

// Generate standard FHIR R4 Bundle
export function generateFhirBundle(patient = initialPatientProfile, report = defaultAnalysisReport) {
  const patientResource = {
    fullUrl: `urn:uuid:patient-${patient.id}`,
    resource: {
      resourceType: "Patient",
      id: patient.id,
      identifier: [
        {
          system: "https://healthid.ndhm.gov.in",
          value: patient.abhaNumber,
          type: { text: "ABHA Health ID (Ayushman Bharat)" }
        }
      ],
      name: [{ text: patient.fullName, family: "Kumar", given: ["A."] }],
      gender: patient.gender.toLowerCase() === "male" ? "male" : "female",
      birthDate: "1984-05-12"
    }
  };

  const observations = (report.results || []).map((res, index) => ({
    fullUrl: `urn:uuid:observation-${res.id}`,
    resource: {
      resourceType: "Observation",
      id: `obs-${index + 1}`,
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
              display: "Laboratory"
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: res.loinc,
            display: res.test
          }
        ],
        text: res.test
      },
      subject: { reference: `urn:uuid:patient-${patient.id}` },
      effectiveDateTime: report.specimenDate || "2026-10-04",
      valueQuantity: {
        value: Number(res.value),
        unit: res.unit,
        system: "http://unitsofmeasure.org"
      },
      interpretation: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              code: res.status === "High" ? "H" : res.status === "Low" ? "L" : "N",
              display: res.status
            }
          ]
        }
      ],
      referenceRange: [
        {
          low: { value: res.refLow, unit: res.unit },
          high: { value: res.refHigh, unit: res.unit }
        }
      ]
    }
  }));

  const medicationRequests = defaultPrescription.medicines.map((med, idx) => ({
    fullUrl: `urn:uuid:med-${med.id}`,
    resource: {
      resourceType: "MedicationRequest",
      id: `medreq-${idx + 1}`,
      status: "active",
      intent: "order",
      medicationCodeableConcept: {
        text: `${med.name} (${med.brand}) ${med.dose}`
      },
      subject: { reference: `urn:uuid:patient-${patient.id}` },
      authoredOn: defaultPrescription.prescribedDate,
      dosageInstruction: [
        {
          text: `${med.dose}, ${med.frequency} - ${med.instructions}`
        }
      ]
    }
  }));

  const conditionResource = {
    fullUrl: "urn:uuid:condition-1",
    resource: {
      resourceType: "Condition",
      id: "cond-1",
      clinicalStatus: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }]
      },
      verificationStatus: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "provisional" }]
      },
      code: {
        coding: [{ system: "http://snomed.info/sct", code: "714628002", display: "Prediabetes" }],
        text: "Impaired Fasting Glucose / Prediabetes Pattern"
      },
      subject: { reference: `urn:uuid:patient-${patient.id}` }
    }
  };

  return {
    resourceType: "Bundle",
    id: `carepilot-bundle-${Date.now()}`,
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: [patientResource, ...observations, ...medicationRequests, conditionResource]
  };
}

// Simulated delay helper
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Handlers
export const mockService = {
  async getRecords() {
    await delay(300);
    const local = localStorage.getItem('carepilot_records');
    return local ? JSON.parse(local) : initialRecords;
  },

  async uploadDocument({ file, documentType }) {
    await delay(1200);
    const newRecord = {
      id: `REC-${Date.now()}`,
      type: documentType,
      title: `${documentType} (${file ? file.name.replace(/\.[^/.]+$/, "") : "Scanned Document"})`,
      date: new Date().toISOString().split('T')[0],
      source: "Uploaded Patient Document",
      labName: "Self-Uploaded Document",
      status: "Analyzed",
      criticalCount: 0,
      abnormalCount: 2,
      fileName: file ? file.name : "document.pdf",
      fileSize: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
      resultsCount: 8,
      highlights: ["Fasting Glucose 114 mg/dL", "HbA1c 6.2%"]
    };
    return {
      success: true,
      record: newRecord,
      analysisId: "REP-2026-10-04"
    };
  },

  async getReportAnalysis(id) {
    await delay(350);
    const local = localStorage.getItem('carepilot_active_report');
    if (local) {
      return JSON.parse(local);
    }
    return defaultAnalysisReport;
  },

  async scanMedicine(imageFile) {
    await delay(1400);
    return {
      isIdentified: true,
      demoTag: "Demo result",
      brandName: "Glycomet 500 SR",
      genericName: "Metformin Hydrochloride Prolonged-Release",
      strength: "500 mg",
      form: "Oral Tablet",
      expiryDate: "08/2027",
      batchNo: "GL-4920B",
      activeIngredient: "Metformin HCl (500mg)",
      ocrConfidence: 0.94,
      source: "Package Strip OCR & Index",
      safetyWarning: "Verify with the package, your prescription or a pharmacist. No dosage advice is given here.",
      recognizedText: "Glycomet 500 SR | Metformin HCl Prolonged-Release Tablets IP 500 mg | Mfg Lic No: M/729/2018 | Exp: 08/2027"
    };
  },

  async getTimeline() {
    await delay(300);
    const local = localStorage.getItem('carepilot_timeline');
    return local ? JSON.parse(local) : initialTimelineEvents;
  },

  async getHealthSummary() {
    await delay(300);
    return {
      hba1cTrends: hba1cTrendData,
      hemoglobinTrends: hemoglobinTrendData,
      overviewMetrics: [
        { label: "Current HbA1c", value: "6.2%", delta: "-0.2%", trend: "down", status: "warning", benchmark: "<5.7%" },
        { label: "Fasting Glucose", value: "114 mg/dL", delta: "-4 mg/dL", trend: "down", status: "warning", benchmark: "<100 mg/dL" },
        { label: "Hemoglobin", value: "14.2 g/dL", delta: "+0.4 g/dL", trend: "up", status: "normal", benchmark: "13.0-17.0" },
        { label: "Serum Creatinine", value: "0.89 mg/dL", delta: "-0.03", trend: "stable", status: "normal", benchmark: "0.7-1.2" }
      ],
      resultsToDiscuss: [
        { test: "Fasting Blood Glucose", value: "114 mg/dL", badge: "High", urgency: "Routine" },
        { test: "HbA1c", value: "6.2%", badge: "High", urgency: "Routine" },
        { test: "LDL Cholesterol", value: "138 mg/dL", badge: "High", urgency: "Routine" },
        { test: "Vitamin D (25-OH)", value: "22.4 ng/mL", badge: "Low", urgency: "Routine" }
      ],
      questionsForDoctor: [
        "My HbA1c improved from 6.5% to 6.2%. Should I maintain my current diet or begin low-dose medication?",
        "Given my LDL of 138 mg/dL and pre-diabetes, should we compute an ASCVD 10-year risk score?",
        "How much longer should I continue weekly 60,000 IU Vitamin D supplementation?",
        "Do you recommend checking a urine microalbumin test during my next annual visit?"
      ]
    };
  },

  async sendChatMessage({ message, contextReportId }) {
    await delay(900);
    const q = message.toLowerCase();

    // Guardrail: Diagnosis or medicine change refusal
    if (q.includes("prescribe") || q.includes("dosage") || q.includes("stop taking") || q.includes("change medicine") || q.includes("diagnose me")) {
      return {
        role: "assistant",
        text: "**Safety Notice: Medical Guardrail Triggered**\n\nCarePilot AI cannot diagnose medical conditions, recommend medication changes, or alter prescription dosages.\n\nOnly a licensed physician who has examined you can safely adjust your treatment plan. Please bring your report to your doctor or consult a pharmacist.",
        isRefusal: true
      };
    }

    if (q.includes("hba1c") || q.includes("sugar") || q.includes("glucose") || q.includes("diabetes")) {
      return {
        role: "assistant",
        text: `### What the Report Says
Your Glycated Hemoglobin (HbA1c) is **6.2%** (normal lab reference is below 5.7%). Additionally, your Fasting Blood Glucose was recorded at **114 mg/dL** (reference 70–99 mg/dL).

### Longitudinal Context
Your HbA1c has trended downward from **6.5%** (March 2026) to **6.4%** (June 2026) and now **6.2%** (October 2026). This steady reduction indicates positive momentum from your metabolic management.

### Possibilities (Not a Diagnosis)
1. Impaired fasting glucose and pre-diabetes metabolic category (5.7% to 6.4% band).
2. Improving insulin sensitivity correlated with recent lifestyle or medication support.

### Next Step
Share this longitudinal trend with your doctor. They will determine whether continued lifestyle modifications are sufficient or if medical therapy is indicated.`
      };
    }

    if (q.includes("creatinine") || q.includes("kidney")) {
      return {
        role: "assistant",
        text: `### What the Report Says
Your Serum Creatinine is **0.89 mg/dL**, comfortably within the laboratory's normal reference band of **0.70 to 1.20 mg/dL**.

### Possibilities (Not a Diagnosis)
This reflects normal glomerular filtration and healthy renal clearance of metabolic byproducts.

### Next Step
No urgent action is indicated from this parameter. Discuss your full metabolic profile during your routine checkup.`
      };
    }

    if (q.includes("ldl") || q.includes("cholesterol") || q.includes("lipid")) {
      return {
        role: "assistant",
        text: `### What the Report Says
Your calculated LDL Cholesterol is **138 mg/dL**. Standard preventative lab guidelines target LDL below **100 mg/dL**.

### Possibilities (Not a Diagnosis)
Elevated LDL is commonly associated with dietary saturated fat intake, genetic lipid processing traits, or metabolic syndrome.

### Next Step
Discuss your complete cardiovascular risk profile with your healthcare provider to review dietary choices or discuss if statin therapy is appropriate.`
      };
    }

    // Default structured response
    return {
      role: "assistant",
      text: `### What the Report Says
According to your October 2026 Comprehensive Metabolic Panel, the majority of your values (Creatinine, Hemoglobin, TSH, Liver enzymes) are within normal reference ranges. Fasting Glucose (114 mg/dL), HbA1c (6.2%), and LDL (138 mg/dL) are slightly elevated, while Vitamin D (22.4 ng/mL) remains mildly insufficient.

### Possibilities (Not a Diagnosis)
These findings suggest a mild pre-diabetic metabolic pattern alongside borderline dyslipidemia, both of which are commonly responsive to lifestyle and clinical interventions.

### Next Step
Always consult your physician for individualized evaluation. Never modify any treatment without medical supervision.`
    };
  }
};
