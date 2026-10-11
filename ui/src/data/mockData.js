// CarePilot AI — Realistic Clinical Demo Data
// Spanning 8 months with longitudinal biomarkers, lab reports, and prescriptions.

export const initialPatientProfile = {
  id: "P-883910",
  initials: "A.K.",
  fullName: "A. Kumar",
  age: 42,
  gender: "Male",
  bloodGroup: "B+",
  emergencyContact: "+91 98765 43210 (Spouse)",
  abhaNumber: "91-4820-9182-3714",
  abhaAddress: "ak.kumar@abdm",
  abhaLinked: true
};

export const initialRecords = [
  {
    id: "REC-2026-10-04",
    type: "Lab Report",
    title: "Comprehensive Metabolic & Lipid Panel",
    date: "2026-10-04",
    source: "Apex Diagnostics & Specialty Labs",
    labName: "Apex Diagnostics",
    status: "Review Required",
    criticalCount: 0,
    abnormalCount: 3,
    fileName: "Apex_Metabolic_Oct2026.pdf",
    fileSize: "1.8 MB",
    resultsCount: 10,
    highlights: ["Fasting Glucose 114 mg/dL (High)", "HbA1c 6.2% (Pre-diabetic band)", "LDL 138 mg/dL (Borderline High)"]
  },
  {
    id: "REC-2026-08-15",
    type: "Prescription",
    title: "Metabolic Follow-up & Statin Prescription",
    date: "2026-08-15",
    source: "Dr. R. Sharma, MD (Internal Medicine)",
    labName: "CareMax Specialty Clinic",
    status: "Verified",
    criticalCount: 0,
    abnormalCount: 0,
    fileName: "DrSharma_Rx_Aug2026.jpg",
    fileSize: "2.1 MB",
    medicinesCount: 3,
    highlights: ["Metformin 500mg OD", "Atorvastatin 10mg HS", "Vitamin D3 60,000 IU weekly"]
  },
  {
    id: "REC-2026-06-20",
    type: "Lab Report",
    title: "Routine Glycemic & Renal Profile",
    date: "2026-06-20",
    source: "MetroPath Clinical Laboratory",
    labName: "MetroPath Lab",
    status: "Reviewed",
    criticalCount: 0,
    abnormalCount: 2,
    fileName: "MetroPath_Glycemic_Jun2026.pdf",
    fileSize: "1.4 MB",
    resultsCount: 6,
    highlights: ["HbA1c 6.4%", "Fasting Glucose 118 mg/dL", "Creatinine 0.92 mg/dL (Normal)"]
  },
  {
    id: "REC-2026-05-12",
    type: "Diagnostic Report",
    title: "Abdominal Ultrasound Examination",
    date: "2026-05-12",
    source: "Apollo Imaging Institute",
    labName: "Apollo Imaging",
    status: "Normal",
    criticalCount: 0,
    abnormalCount: 0,
    fileName: "Apollo_USG_Abdomen_May2026.pdf",
    fileSize: "4.2 MB",
    resultsCount: 1,
    highlights: ["Mild diffuse hepatic steatosis (Grade 1)", "Normal renal parenchyma"]
  },
  {
    id: "REC-2026-03-08",
    type: "Lab Report",
    title: "Bi-annual Health Screening & Complete Blood Count",
    date: "2026-03-08",
    source: "Apex Diagnostics & Specialty Labs",
    labName: "Apex Diagnostics",
    status: "Reviewed",
    criticalCount: 0,
    abnormalCount: 3,
    fileName: "Apex_AnnualCheckup_Mar2026.pdf",
    fileSize: "2.3 MB",
    resultsCount: 10,
    highlights: ["HbA1c 6.5%", "Hemoglobin 13.8 g/dL", "Vitamin D 18 ng/mL (Deficient)"]
  },
  {
    id: "REC-2026-02-10",
    type: "Discharge Summary",
    title: "Outpatient Acute Gastroenteritis Resolution",
    date: "2026-02-10",
    source: "Fortis Healthcare Hospital",
    labName: "Fortis Emergency & Daycare",
    status: "Resolved",
    criticalCount: 0,
    abnormalCount: 0,
    fileName: "Fortis_Discharge_Feb2026.pdf",
    fileSize: "3.1 MB",
    resultsCount: 4,
    highlights: ["Electrolytes normalized", "Discharged in hemodynamically stable condition"]
  }
];

// Hero Lab Report with 10 results, OCR confidence, LOINC, and structured medical breakdown
export const defaultAnalysisReport = {
  id: "REP-2026-10-04",
  recordId: "REC-2026-10-04",
  reportType: "Comprehensive Metabolic & Lipid Panel",
  labName: "Apex Diagnostics & Research Centre",
  specimenDate: "2026-10-04",
  reportedDate: "2026-10-04 18:30 IST",
  patientInitials: "A.K.",
  patientAgeGender: "42Y / M",
  specimenType: "Venous Blood (Serum & Plasma)",
  fastingStatus: "Fasting (10 hours)",
  documentUrl: null, // Simulated high-fidelity medical layout
  results: [
    {
      id: "res-1",
      test: "Fasting Blood Glucose",
      loinc: "1558-6",
      value: 114,
      unit: "mg/dL",
      refLow: 70,
      refHigh: 99,
      confidence: 0.98,
      status: "High", // Normal, High, Low, Needs verification, Critical
      isUrgent: false,
      bbox: { x: 8, y: 18, width: 84, height: 6 },
      explanation: {
        whatMeasures: "Measures the amount of free glucose circulating in your blood after an overnight fast of at least 8 to 10 hours.",
        vsRange: "Your result of 114 mg/dL is 15 mg/dL above the standard healthy fasting upper limit (99 mg/dL). It falls within the impaired fasting glucose (pre-diabetes) range (100–125 mg/dL).",
        possibilities: "Impaired insulin sensitivity, recent carbohydrate-heavy evening meal, mild systemic stress or sleep deprivation, early metabolic dysregulation.",
        confounders: "Fasting duration shorter than 8 hours, emotional acute stress, certain medications (like corticosteroids or beta-blockers), acute infection or illness.",
        doctorQuestions: [
          "Should we re-test this alongside a repeat oral glucose tolerance test (OGTT)?",
          "Would lifestyle modifications (dietary adjustments, resistance exercise) be sufficient before considering medication?",
          "How frequently should I self-monitor fasting capillary glucose at home?"
        ],
        nextStep: "Discuss with a qualified healthcare professional during your next scheduled consult to interpret this in the context of your overall metabolic history."
      }
    },
    {
      id: "res-2",
      test: "Glycated Hemoglobin (HbA1c)",
      loinc: "4548-4",
      value: 6.2,
      unit: "%",
      refLow: 4.0,
      refHigh: 5.6,
      confidence: 0.99,
      status: "High",
      isUrgent: false,
      bbox: { x: 8, y: 25, width: 84, height: 6 },
      explanation: {
        whatMeasures: "Reflects your average blood sugar concentration over the past 2 to 3 months by assessing how much glucose has bound to hemoglobin inside red blood cells.",
        vsRange: "Your reading of 6.2% is above the normal threshold (<5.7%), placing it within the pre-diabetes diagnostic category (5.7% to 6.4%).",
        possibilities: "Persistent mild elevation in blood glucose levels over the prior 90 days; positive news is that it has dropped from your March 2026 level of 6.5%.",
        confounders: "Hemoglobin variants (e.g. thalassemia trait), severe iron deficiency anemia, conditions altering red blood cell turnover or lifespan.",
        doctorQuestions: [
          "What is my individualized target HbA1c based on my age and cardiovascular risk profile?",
          "Are my current dietary adjustments working effectively given the downward trend from 6.5% to 6.2%?",
          "When should we perform the next HbA1c review (3 vs 6 months)?"
        ],
        nextStep: "Discuss with a qualified healthcare professional. Do not alter any medication dosages independently."
      }
    },
    {
      id: "res-3",
      test: "Hemoglobin (Hb)",
      loinc: "718-7",
      value: 14.2,
      unit: "g/dL",
      refLow: 13.0,
      refHigh: 17.0,
      confidence: 0.97,
      status: "Normal",
      isUrgent: false,
      bbox: { x: 8, y: 32, width: 84, height: 6 },
      explanation: {
        whatMeasures: "The iron-rich protein in red blood cells responsible for carrying oxygen from the lungs to tissues throughout the body.",
        vsRange: "Your result of 14.2 g/dL is comfortably centered within the reference range for adult males (13.0–17.0 g/dL).",
        possibilities: "Optimal red blood cell production, balanced nutritional iron intake, and normal bone marrow hematopoiesis.",
        confounders: "Mild dehydration can artificially elevate hemoglobin concentration; recent blood donation or high altitude can shift values.",
        doctorQuestions: [
          "Does this normal hemoglobin level confirm adequate dietary iron intake?",
          "Are there any baseline red blood cell indices (MCV, MCH) that warrant attention?"
        ],
        nextStep: "Result is within the lab's normal reference band. Continue maintaining balanced nutritional habits."
      }
    },
    {
      id: "res-4",
      test: "LDL Cholesterol (Calculated)",
      loinc: "13457-7",
      value: 138,
      unit: "mg/dL",
      refLow: 0,
      refHigh: 100,
      confidence: 0.95,
      status: "High",
      isUrgent: false,
      bbox: { x: 8, y: 39, width: 84, height: 6 },
      explanation: {
        whatMeasures: "Often termed 'bad cholesterol', low-density lipoprotein transports cholesterol particles into vascular arterial walls.",
        vsRange: "At 138 mg/dL, this value exceeds the standard primary prevention target (<100 mg/dL), categorizing as borderline high.",
        possibilities: "Familial hypercholesterolemia tendency, dietary saturated and trans fat consumption, sedentary lifestyle, interaction with insulin resistance.",
        confounders: "Non-fasting blood draws, sudden acute weight loss, thyroid dysfunction (hypothyroidism can elevate LDL), acute illness.",
        doctorQuestions: [
          "Given my HbA1c level, what is my recommended target LDL level?",
          "Is a low-dose statin therapy warranted, or can we trial 3 months of strict Mediterranean-style dietary adjustments first?",
          "Should we order an ApoB or Lipoprotein(a) test for refined cardiovascular risk stratification?"
        ],
        nextStep: "Discuss with a qualified healthcare professional to evaluate your 10-year atherosclerotic cardiovascular risk."
      }
    },
    {
      id: "res-5",
      test: "Serum Creatinine",
      loinc: "2160-0",
      value: 0.89,
      unit: "mg/dL",
      refLow: 0.70,
      refHigh: 1.20,
      confidence: 0.99,
      status: "Normal",
      isUrgent: false,
      bbox: { x: 8, y: 46, width: 84, height: 6 },
      explanation: {
        whatMeasures: "A waste product produced by normal muscle breakdown, filtered entirely out of the blood by healthy kidneys.",
        vsRange: "0.89 mg/dL is well within the healthy renal filtration benchmark (0.70–1.20 mg/dL).",
        possibilities: "Normal glomerular filtration function and adequate renal blood clearance.",
        confounders: "High-protein red meat intake shortly before testing, creatine muscle supplements, intense heavy weight training.",
        doctorQuestions: [
          "Is my estimated Glomerular Filtration Rate (eGFR) consistent with this creatinine reading?",
          "Do you recommend checking a urine albumin-to-creatinine ratio (uACR) for diabetic microvascular screening?"
        ],
        nextStep: "Renal clearance is within normal limits. Maintain adequate daily hydration."
      }
    },
    {
      id: "res-6",
      test: "Thyroid Stimulating Hormone (TSH)",
      loinc: "3016-3",
      value: 2.45,
      unit: "μIU/mL",
      refLow: 0.40,
      refHigh: 4.20,
      confidence: 0.94,
      status: "Normal",
      isUrgent: false,
      bbox: { x: 8, y: 53, width: 84, height: 6 },
      explanation: {
        whatMeasures: "Produced by the pituitary gland to regulate thyroid hormone output (T3 and T4), governing cellular metabolic rate.",
        vsRange: "2.45 μIU/mL sits ideal in the euthyroid middle of the standard reference band (0.40–4.20 μIU/mL).",
        possibilities: "Healthy pituitary-thyroid feedback axis with balanced metabolic endocrine signaling.",
        confounders: "High-dose biotin supplements within 48 hours of testing, circadian morning peak vs evening trough, acute systemic viral illness.",
        doctorQuestions: [
          "Does this normal TSH rule out thyroid involvement in my fatigue or lipid levels?"
        ],
        nextStep: "Normal thyroid function. No further endocrine workup indicated from this parameter."
      }
    },
    {
      id: "res-7",
      test: "Vitamin D (25-Hydroxy)",
      loinc: "1989-3",
      value: 22.4,
      unit: "ng/mL",
      refLow: 30.0,
      refHigh: 100.0,
      confidence: 0.96,
      status: "Low",
      isUrgent: false,
      bbox: { x: 8, y: 60, width: 84, height: 6 },
      explanation: {
        whatMeasures: "The primary circulating form of vitamin D, crucial for calcium absorption, bone mineralization, and immune modulation.",
        vsRange: "Your value of 22.4 ng/mL is below the 30 ng/mL sufficiency threshold, reflecting mild insufficiency (improving from 18 ng/mL in March).",
        possibilities: "Limited cutaneous sunlight synthesis, indoor desk work, reduced dietary intake of fatty fish/fortified dairy.",
        confounders: "Seasonal winter variations, skin pigmentation, intestinal malabsorption issues, compliance with prescribed supplements.",
        doctorQuestions: [
          "Should I continue weekly 60,000 IU cholecalciferol capsules, or transition to a daily maintenance dose of 2,000 IU?",
          "Do you recommend checking serum calcium and parathyroid hormone (PTH) concurrently?"
        ],
        nextStep: "Discuss with a qualified healthcare professional regarding continuation of your supplementation plan."
      }
    },
    {
      id: "res-8",
      test: "Platelet Count",
      loinc: "777-3",
      value: 245,
      unit: "10^3/μL",
      refLow: 150,
      refHigh: 450,
      confidence: 0.98,
      status: "Normal",
      isUrgent: false,
      bbox: { x: 8, y: 67, width: 84, height: 6 },
      explanation: {
        whatMeasures: "Cell fragments essential for normal blood clot formation and wound healing.",
        vsRange: "245 × 10^3/μL is normal and healthy (reference: 150–450 × 10^3/μL).",
        possibilities: "Stable bone marrow thrombopoiesis with absence of consumptive coagulopathy.",
        confounders: "In vitro platelet clumping in EDTA test tubes (pseudothrombocytopenia), intense exercise.",
        doctorQuestions: ["Are all platelet indices within normal parameters?"],
        nextStep: "Normal result. No action required."
      }
    },
    {
      id: "res-9",
      test: "Alanine Aminotransferase (ALT/SGPT)",
      loinc: "1742-6",
      value: 38,
      unit: "U/L",
      refLow: 7,
      refHigh: 56,
      confidence: 0.97,
      status: "Normal",
      isUrgent: false,
      bbox: { x: 8, y: 74, width: 84, height: 6 },
      explanation: {
        whatMeasures: "An intracellular enzyme found primarily inside liver hepatocytes; released into blood during hepatic cellular stress.",
        vsRange: "38 U/L is inside the normal range (<56 U/L), though near the upper third.",
        possibilities: "Hepatic integrity preserved; compatible with the Grade 1 fatty liver noted on ultrasound without active hepatocellular inflammation.",
        confounders: "Strenuous weightlifting 24h prior, alcohol consumption, certain over-the-counter NSAIDs or statins.",
        doctorQuestions: [
          "Does this normal ALT confirm that the mild fatty liver seen on ultrasound is not currently inflaming liver cells?"
        ],
        nextStep: "Normal enzyme level. Continue healthy dietary habits and avoid heavy alcohol intake."
      }
    },
    {
      id: "res-10",
      test: "Total Bilirubin",
      loinc: "1975-2",
      value: 0.72,
      unit: "mg/dL",
      refLow: 0.2,
      refHigh: 1.2,
      confidence: 0.93,
      status: "Normal",
      isUrgent: false,
      bbox: { x: 8, y: 81, width: 84, height: 6 },
      explanation: {
        whatMeasures: "Yellowish pigment made during the normal breakdown of red blood cells, processed through the liver and bile ducts.",
        vsRange: "0.72 mg/dL is well within the healthy clearance limit (0.2–1.2 mg/dL).",
        possibilities: "Healthy bilirubin clearance through biliary excretory pathways.",
        confounders: "Prolonged fasting (can cause mild benign rise in Gilbert's syndrome), vigorous exercise.",
        doctorQuestions: ["Is the fractionated direct/indirect ratio relevant?"],
        nextStep: "Normal result."
      }
    }
  ]
};

// Prescription realistic data
export const defaultPrescription = {
  id: "RX-2026-08-15",
  recordId: "REC-2026-08-15",
  doctorName: "Dr. R. Sharma, MD",
  clinic: "CareMax Specialty Clinic",
  prescribedDate: "2026-08-15",
  diagnosisNotes: "Pre-diabetes lifestyle management, dyslipidemia, mild hypovitaminosis D.",
  medicines: [
    {
      id: "med-1",
      name: "Metformin Hydrochloride",
      brand: "Glycomet 500",
      dose: "500 mg",
      form: "Extended Release Tablet",
      frequency: "Once daily (with dinner)",
      duration: "90 days",
      instructions: "Take with food to minimize gastrointestinal discomfort.",
      status: "Active"
    },
    {
      id: "med-2",
      name: "Atorvastatin Calcium",
      brand: "Atorva 10",
      dose: "10 mg",
      form: "Film-coated Tablet",
      frequency: "Once daily (at bedtime)",
      duration: "90 days",
      instructions: "Take at nighttime with water. Avoid grapefruit juice.",
      status: "Active"
    },
    {
      id: "med-3",
      name: "Cholecalciferol (Vitamin D3)",
      brand: "Calcirol 60K",
      dose: "60,000 IU",
      form: "Soft Gelatin Capsule",
      frequency: "Once weekly (every Sunday)",
      duration: "8 weeks",
      instructions: "Take after a meal containing healthy fats for optimal absorption.",
      status: "Active"
    }
  ]
};

// Longitudinal Trend Datasets (Recharts line charts with reference bands)
export const hba1cTrendData = [
  { date: "2026-03-08", value: 6.5, refLow: 4.0, refHigh: 5.6, status: "High", label: "Mar 2026" },
  { date: "2026-06-20", value: 6.4, refLow: 4.0, refHigh: 5.6, status: "High", label: "Jun 2026" },
  { date: "2026-10-04", value: 6.2, refLow: 4.0, refHigh: 5.6, status: "High", label: "Oct 2026" }
];

export const hemoglobinTrendData = [
  { date: "2026-02-10", value: 13.5, refLow: 13.0, refHigh: 17.0, status: "Normal", label: "Feb 2026" },
  { date: "2026-03-08", value: 13.8, refLow: 13.0, refHigh: 17.0, status: "Normal", label: "Mar 2026" },
  { date: "2026-06-20", value: 14.0, refLow: 13.0, refHigh: 17.0, status: "Normal", label: "Jun 2026" },
  { date: "2026-10-04", value: 14.2, refLow: 13.0, refHigh: 17.0, status: "Normal", label: "Oct 2026" }
];

// Timeline grouped events
export const initialTimelineEvents = [
  {
    id: "tl-1",
    date: "2026-10-04",
    monthGroup: "October 2026",
    category: "lab",
    title: "Comprehensive Metabolic & Lipid Panel",
    source: "Apex Diagnostics",
    summary: "10 biomarkers analyzed. Fasting Glucose (114 mg/dL) & HbA1c (6.2%) remain in pre-diabetes range. LDL 138 mg/dL.",
    badge: "3 Abnormal",
    badgeType: "warning",
    linkToAnalysis: "REP-2026-10-04"
  },
  {
    id: "tl-2",
    date: "2026-08-15",
    monthGroup: "August 2026",
    category: "prescription",
    title: "Prescription Refill & Lipid Management",
    source: "Dr. R. Sharma, MD",
    summary: "Started Atorvastatin 10mg HS, continued Metformin 500mg OD and weekly Vitamin D3 60,000 IU.",
    badge: "3 Medicines",
    badgeType: "normal"
  },
  {
    id: "tl-3",
    date: "2026-06-20",
    monthGroup: "June 2026",
    category: "lab",
    title: "Glycemic & Renal Follow-up",
    source: "MetroPath Lab",
    summary: "HbA1c decreased slightly to 6.4%. Creatinine normal at 0.92 mg/dL.",
    badge: "2 Abnormal",
    badgeType: "warning"
  },
  {
    id: "tl-4",
    date: "2026-05-12",
    monthGroup: "May 2026",
    category: "diagnostic",
    title: "Abdominal Ultrasound Examination",
    source: "Apollo Imaging Institute",
    summary: "Demonstrated mild Grade 1 hepatic steatosis. Kidneys and spleen unremarkable.",
    badge: "Grade 1 Steatosis",
    badgeType: "normal"
  },
  {
    id: "tl-5",
    date: "2026-03-08",
    monthGroup: "March 2026",
    category: "lab",
    title: "Bi-annual Health Screening & Complete Blood Count",
    source: "Apex Diagnostics",
    summary: "Baseline HbA1c at 6.5%. Vitamin D deficiency identified at 18 ng/mL.",
    badge: "Deficient Vit D",
    badgeType: "warning"
  },
  {
    id: "tl-6",
    date: "2026-02-10",
    monthGroup: "February 2026",
    category: "consultation",
    title: "Acute Gastroenteritis Resolution",
    source: "Fortis Healthcare",
    summary: "Daycare fluid therapy and electrolyte restoration. Fully resolved.",
    badge: "Resolved",
    badgeType: "normal"
  }
];

// User-added follow-up reminders
export const initialFollowUps = [
  {
    id: "fu-1",
    title: "Repeat Fasting Blood Sugar & HbA1c Check",
    dueDate: "2027-01-10",
    provider: "Apex Diagnostics / Dr. Sharma",
    notes: "Check whether HbA1c drops below 6.0% after 3 months of regular exercise.",
    completed: false
  },
  {
    id: "fu-2",
    title: "Check Serum Vitamin D Levels Post-Supplementation",
    dueDate: "2026-11-20",
    provider: "CareMax Clinic",
    notes: "Confirm Vitamin D has surpassed the target 30 ng/mL mark.",
    completed: false
  }
];
