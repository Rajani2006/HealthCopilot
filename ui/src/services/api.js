// CarePilot AI — Real API Service Layer
// Connects to FastAPI backend at VITE_API_BASE_URL
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Core HTTP request helper.
 * - Prepends base URL
 * - Parses JSON responses
 * - Extracts backend error detail (string or joined array)
 * - Flags network failures with code: "BACKEND_OFFLINE"
 * - NEVER logs request or response bodies to protect health data
 */
export async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  let res;

  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    const netErr = new Error("Backend not connected. Start the API on http://localhost:8000");
    netErr.code = "BACKEND_OFFLINE";
    netErr.original = err;
    throw netErr;
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        if (Array.isArray(errJson.detail)) {
          msg = errJson.detail
            .map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
            .join(', ');
        } else if (typeof errJson.detail === 'string') {
          msg = errJson.detail;
        } else {
          msg = JSON.stringify(errJson.detail);
        }
      } else if (errJson && errJson.message) {
        msg = errJson.message;
      }
    } catch {
      msg = res.statusText || msg;
    }
    const apiErr = new Error(msg);
    apiErr.status = res.status;
    throw apiErr;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return res;
}

// 1. Health check: GET /api/health -> {status, llm, ocrLangs}
export async function getHealth(signal) {
  return request("/api/health", { method: "GET", signal });
}

// 2. Upload Record: POST multipart /api/records/upload with file, record_type, consent
export async function uploadRecord(file, recordType = "lab_report", consent = true, signal) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("record_type", recordType);
  formData.append("consent", String(consent));

  return request("/api/records/upload", {
    method: "POST",
    body: formData,
    signal
  });
}

// 3. Analyze Report: POST JSON /api/analysis/report -> {record_id, language}
export async function analyzeReport(recordId, language = "en", signal) {
  return request("/api/analysis/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record_id: recordId, language }),
    signal
  });
}

// 4. Correct Results: PATCH /api/records/{id}/results -> {results:[{test,value,unit,refLow,refHigh}]}
export async function correctResults(recordId, results, signal) {
  return request(`/api/records/${recordId}/results`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results }),
    signal
  });
}

// 5. List Records: GET /api/records?search=&type=&sort=newest|oldest
export async function listRecords({ search = "", type = "", sort = "newest" } = {}, signal) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (type && type !== "All" && type !== "all") params.append("type", type);
  if (sort) params.append("sort", sort);

  const qs = params.toString();
  return request(`/api/records${qs ? `?${qs}` : ""}`, { method: "GET", signal });
}

// 6. Get Single Record: GET /api/records/{id}
export async function getRecord(id, signal) {
  return request(`/api/records/${id}`, { method: "GET", signal });
}

// 7. Delete Record: DELETE /api/records/{id}
export async function deleteRecord(id, signal) {
  return request(`/api/records/${id}`, { method: "DELETE", signal });
}

// 8. Delete All Records: DELETE /api/records
export async function deleteAllRecords(signal) {
  return request("/api/records", { method: "DELETE", signal });
}

// 9. Record File URL: ${BASE}/api/records/{id}/file
export function recordFileUrl(id) {
  return `${BASE}/api/records/${id}/file`;
}

// 10. Scan Medicine Image: POST multipart /api/analysis/medicine-image field file
export async function scanMedicineImage(file, signal) {
  const formData = new FormData();
  formData.append("file", file);

  return request("/api/analysis/medicine-image", {
    method: "POST",
    body: formData,
    signal
  });
}

// 11. Timeline: GET /api/health/timeline?type=
export async function getTimeline(type = "", signal) {
  const params = new URLSearchParams();
  if (type && type !== "all" && type !== "All") params.append("type", type);
  const qs = params.toString();
  return request(`/api/health/timeline${qs ? `?${qs}` : ""}`, { method: "GET", signal });
}

// 12. Health Summary: GET /api/health/summary
export async function getSummary(signal) {
  return request("/api/health/summary", { method: "GET", signal });
}

// 13. AI Assistant Chat: POST JSON /api/assistant/chat -> {message, record_id, language}
export async function chat({ message, recordId = null, language = "en" }, signal) {
  return request("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      record_id: recordId || undefined,
      language
    }),
    signal
  });
}

// 14. Link ABHA: POST JSON /api/abha/link -> {abha}
export async function linkAbha(abha, signal) {
  return request("/api/abha/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ abha }),
    signal
  });
}

// 15. Export FHIR: GET /api/export/fhir
export async function exportFhir(signal) {
  return request("/api/export/fhir", { method: "GET", signal });
}

// 16. Export Records: GET /api/export/records
export async function exportRecords(signal) {
  return request("/api/export/records", { method: "GET", signal });
}

// Compatibility object for callers importing `api`
export const api = {
  getBaseUrl: () => BASE,
  getHealth,
  uploadRecord,
  analyzeReport,
  correctResults,
  listRecords,
  getRecord,
  deleteRecord,
  deleteAllRecords,
  recordFileUrl,
  scanMedicineImage,
  getTimeline,
  getSummary,
  chat,
  linkAbha,
  exportFhir,
  exportRecords
};
