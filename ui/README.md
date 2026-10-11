# CarePilot AI — Personal Health Copilot

CarePilot AI is a modern, clinical-grade patient copilot built for hackathon demos and health-tech production. It enables patients to upload complex medical lab reports and prescriptions, view extracted biomarker facts via optical character recognition (OCR), inspect plain-language clinical explanations of abnormal values, track longitudinal trends, manage follow-up reminders, and export data in HL7 FHIR R4 interoperable format.

---

## Key Features

1. **High-Fidelity Report Analysis (Hero Experience)**
   - Two-pane layout with original medical document viewer, interactive zoom controls (75%–200%), and bounding box overlays.
   - Extracted values table with LOINC codes, reference intervals, OCR confidence meters, and live status badges (**Normal**, **High**, **Low**, **Needs verification**, **Critical**).
   - **Review Extracted Values**: Inline editing and modal calibration with live recomputation of clinical status badges and explanations.
   - Per-result structured medical explanations: *What this measures*, *Your value vs. range*, *Possible reasons (possibilities, not a diagnosis)*, *Confounding factors*, *Questions to ask your doctor (with copy action)*, and *Next step* (with urgent-care banner for critical values).
   - Explicit attribution tags: **"OCR-extracted fact"** vs. **"AI-generated explanation"**.
   - One-click actions: View Original Report, Ask AI About This Report, Save to Health Timeline, Download Summary (`.txt`), and Copy FHIR JSON.

2. **Longitudinal Dashboard & Trend Charts**
   - Glassmorphic hero and latest clinical AI insight card.
   - Recharts longitudinal line charts for **HbA1c** and **Hemoglobin** with shaded normal reference range bands and contextual tooltips.
   - Real-time stat cards and chronological recent activity feed.

3. **Intelligent Upload Workflow**
   - Drag-and-drop zone with type validation (PDF, JPG, PNG) and 10MB size limit.
   - Camera document capture modal with fallback handling.
   - Document type selector (Lab Report, Prescription, Discharge Summary, Diagnostic Report).
   - Mandatory informed consent gate before analysis begins.
   - 4-step processing pipeline stepper (labeled **"Simulated processing"** in demo mode).

4. **Medicine Scanner**
   - Simulated camera viewfinder with crosshairs and animated laser scanner.
   - Instant drug identification card (brand name, generic, strength, form, expiry, active ingredient, OCR confidence, data source) explicitly labeled **"Demo result"**.
   - Low-confidence fallback state with retake and manual medication entry form.
   - Mandatory clinical safety banner: *"Verify with the package, your prescription or a pharmacist. No dosage advice is given here."*

5. **Guardrailed Assistant Chat**
   - Conversational AI assistant with report-context selection and suggested question chips.
   - Realistic typing indicator with structured responses separating *"What the report says"* from *"Possibilities"*.
   - Strict medical guardrails: refuses direct diagnoses and prescription/dosage alterations with explicit clinical escalation notices.

6. **Interactive Health Records & Timeline**
   - Multi-field search, document type filter chips, date/name sorting.
   - Delete records with confirmation modal and an instant **Undo Toast**.
   - Grouped vertical timeline with category icons, expandable notes, and a follow-up reminder scheduler.

7. **Settings, Mock ABHA & Standards-Compliant FHIR Export**
   - **Mock ABHA Card**: 14-digit Ayushman Bharat Health Account number linking simulation with `ak.kumar@abdm` address.
   - **Export as FHIR R4 Bundle**: Generates valid HL7 FHIR JSON with `Patient`, `Observation` (LOINC: `4548-4`, `1558-6`, `2160-0`, etc.), `MedicationRequest`, and `Condition` resources.
   - Accessibility engine: Font size scaling (Normal, Large, Extra Large), High Contrast dark mode, and Reduced Motion (all responsive via CSS tokens).
   - Typed confirmation data eradication modal (type `DELETE` to wipe).

8. **Internationalization (i18n)**
   - Complete UI translations in English (`en`), Hindi (`hi`), Telugu (`te`), and Tamil (`ta`).
   - Persistent language switcher in the topbar.
   - Clinical disclaimer informing patients that medical summaries are retained in clinical English.

---

## Tech Stack

- **Framework**: React 18 (`react`, `react-dom`)
- **Build Tool**: Vite 5
- **Routing**: React Router v6 (`react-router-dom`)
- **Icons**: Lucide React (`lucide-react`)
- **Data Visualization**: Recharts (`recharts`)
- **Styling**: Modular plain CSS with CSS Custom Properties / Tokens (`tokens.css`, `layout.css`, `components.css`, plus page styles). No Tailwind or Bootstrap dependencies.

---

## Project Structure

```
ui/
├── index.html                   # HTML entry point with Inter & Indian script fonts
├── vite.config.js               # Vite bundler configuration
├── package.json                 # Dependency definitions
├── .env.example                 # Environment variables template
├── README.md                    # System documentation and FastAPI guide
└── src/
    ├── main.jsx                 # React root renderer
    ├── App.jsx                  # Main application router and layout shell
    ├── index.css                # Global root CSS
    ├── styles/
    │   ├── tokens.css           # Color palette, dark glass tokens, fonts, a11y overrides
    │   ├── layout.css           # 12-col grid, sidebar, topbar, mobile drawer & bottom tabs
    │   ├── components.css       # Buttons, cards, badges, modal, toast, stepper, forms
    │   ├── dashboard.css        # Hero glass, stat cards, insight card, Recharts styling
    │   ├── upload.css           # Drag-drop zone, file card, camera preview
    │   ├── analysis.css         # Two-pane layout, zoom controls, bounding box overlay
    │   ├── records.css          # Search bar, filter chips, record card grid
    │   ├── timeline.css         # Vertical timeline track, month groups, expandable cards
    │   ├── summary.css          # Sparkline metrics, discussion items, reminder manager
    │   ├── scanner.css          # Viewfinder, laser scan animation, drug result card
    │   ├── assistant.css        # Chat bubbles, typing indicator, context selector
    │   └── settings.css         # ABHA card, accessibility controls, toggle switches
    ├── i18n/
    │   ├── en.json              # English UI translations
    │   ├── te.json              # Telugu translations
    │   ├── hi.json              # Hindi translations
    │   ├── ta.json              # Tamil translations
    │   └── I18nContext.jsx      # useT hook, language state, persistence
    ├── context/
    │   ├── ToastContext.jsx     # Notifications with undo action support
    │   └── HealthDataContext.jsx# Reactive patient store, live editing, status calculation
    ├── data/
    │   └── mockData.js          # 6 realistic records across 8 months, 10-result lab report, Rx
    ├── services/
    │   ├── api.js               # API fetch client with demoMode fallback for 7 endpoints
    │   └── mock.js              # Mock responses, delay simulation, FHIR R4 Bundle generator
    ├── components/
    │   ├── common/
    │   │   ├── Sidebar.jsx      # Desktop navigation & mobile drawer
    │   │   ├── Topbar.jsx       # Top navigation, language select, persistent demo pill
    │   │   ├── Modal.jsx        # Accessible keyboard-operable modal (Esc close, focus trap)
    │   │   └── StatCard.jsx     # Tabular number metric card with delta indicator
    │   └── analysis/
    │       ├── DocumentViewer.jsx # Zoomable original report canvas with bounding boxes
    │       ├── ValuesTable.jsx    # Extracted biomarker table with live editing & OCR dot
    │       └── ExplanationCard.jsx# Structured accordion: What measures -> Range -> Next step
    └── pages/
        ├── Dashboard.jsx        # Longitudinal overview, Recharts trends, AI insights
        ├── Upload.jsx           # Drag-drop, camera fallback, 4-step stepper
        ├── ReportAnalysis.jsx   # Hero two-pane analysis experience
        ├── HealthRecords.jsx    # Search, type filters, delete with undo toast
        ├── Timeline.jsx         # Vertical timeline grouped by month
        ├── HealthSummary.jsx    # Biomarker sparklines, questions for doctor, reminders
        ├── MedicineScanner.jsx  # Drug package OCR, fallback form, safety banner
        ├── Assistant.jsx        # Guardrailed chatbot with context selector
        └── Settings.jsx         # Profile, mock ABHA, FHIR export, accessibility
```

---

## Installation & Running Locally

1. Navigate to the `ui` folder:
   ```bash
   cd ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build production bundle:
   ```bash
   npm run build
   ```

---

## Demo Mode vs. Real API Mode

CarePilot AI includes built-in auto-detection for backend connectivity:

- **Demo Mode (Default)**: If `VITE_API_BASE_URL` is unset or the backend is not running, the application seamlessly runs on high-fidelity local mock data. A persistent **"Demo data"** pill is displayed in the top bar. All changes (editing values, adding timeline events, creating reminders) persist in browser local storage.
- **Real API Mode**: When `VITE_API_BASE_URL` points to an active backend (e.g. `http://localhost:8000`), the client dispatches real HTTP requests to the 7 endpoints. If any request fails, it gracefully falls back to mock data.

---

## FastAPI Backend Integration Guide

The companion FastAPI backend in the workspace (`main.py`) can be connected directly by providing the endpoints below:

### 1. Upload Document (`POST /upload` or `POST /api/records/upload`)
- **Request**: `multipart/form-data`
  - `file`: Binary file (PDF, JPG, PNG)
  - `document_type`: String (e.g. `"Lab Report"`, `"Prescription"`)
  - `user_id`: String (e.g. `"user-demo-1"`)
- **Response JSON**:
  ```json
  {
    "message": "Document uploaded successfully.",
    "record_id": "REC-7F4B2A8C109D",
    "user_id": "user-demo-1",
    "file_name": "Apex_Metabolic_Oct2026.pdf",
    "processing_status": "completed"
  }
  ```

### 2. Report Analysis (`GET /api/analysis/report/{id}`)
- **Response JSON**:
  ```json
  {
    "id": "REP-2026-10-04",
    "reportType": "Comprehensive Metabolic & Lipid Panel",
    "labName": "Apex Diagnostics & Research Centre",
    "specimenDate": "2026-10-04",
    "patientInitials": "A.K.",
    "results": [
      {
        "id": "res-1",
        "test": "Fasting Blood Glucose",
        "loinc": "1558-6",
        "value": 114,
        "unit": "mg/dL",
        "refLow": 70,
        "refHigh": 99,
        "confidence": 0.98,
        "status": "High",
        "explanation": {
          "whatMeasures": "Measures free glucose circulating in blood after fasting.",
          "vsRange": "Your result of 114 mg/dL is 15 mg/dL above standard upper limit.",
          "possibilities": "Impaired insulin sensitivity or pre-diabetes pattern.",
          "confounders": "Fasting duration under 8 hours, acute stress, illness.",
          "doctorQuestions": ["Should we schedule a follow-up OGTT?"],
          "nextStep": "Discuss with a qualified healthcare professional."
        }
      }
    ]
  }
  ```

### 3. Medicine Image Recognition (`POST /api/analysis/medicine-image`)
- **Request**: `multipart/form-data` with `image`
- **Response JSON**:
  ```json
  {
    "isIdentified": true,
    "demoTag": "Demo result",
    "brandName": "Glycomet 500 SR",
    "genericName": "Metformin Hydrochloride Prolonged-Release",
    "strength": "500 mg",
    "form": "Oral Tablet",
    "expiryDate": "08/2027",
    "activeIngredient": "Metformin HCl (500mg)",
    "ocrConfidence": 0.94,
    "source": "Package Strip OCR & Index",
    "safetyWarning": "Verify with the package, your prescription or a pharmacist. No dosage advice is given here."
  }
  ```

### 4. Assistant Chat (`POST /api/assistant/chat`)
- **Request JSON**:
  ```json
  {
    "message": "Why is my HbA1c elevated?",
    "context_report_id": "REP-2026-10-04"
  }
  ```
- **Response JSON**:
  ```json
  {
    "role": "assistant",
    "text": "### What the Report Says\nYour HbA1c is 6.2%...\n\n### Possibilities\nPre-diabetic metabolic category...\n\n### Next Step\nDiscuss this trend with your physician.",
    "isRefusal": false
  }
  ```

---

## Known Limitations & Regulatory Scope

1. **Informational Scope Only**: CarePilot AI is an informational tool and does not provide clinical diagnoses, prescriptive medical advice, or dosage alterations.
2. **OCR Boundaries in Demo**: Optical recognition in demo mode is calibrated for typed laboratory panels and packaged pharmaceutical typography; handwritten physician script and regional-language document OCR are not supported in the demo pipeline.
3. **Regional Translation Notice**: While UI navigation and controls are fully localized across English, Telugu, Hindi, and Tamil, raw clinical explanations are kept in clinical English until certified regional medical terminology translation services are integrated.
