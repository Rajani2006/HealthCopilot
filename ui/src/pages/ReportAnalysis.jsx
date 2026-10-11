import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  MessageSquareText,
  CalendarPlus,
  Download,
  Copy,
  Building,
  Calendar,
  User,
  ShieldCheck,
  Edit3,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useT } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { useBackend } from '../context/BackendContext';
import { getRecord, correctResults, exportFhir, recordFileUrl, listRecords } from '../services/api';
import { mockService, generateFhirBundle } from '../services/mock';
import DocumentViewer from '../components/analysis/DocumentViewer';
import ValuesTable from '../components/analysis/ValuesTable';
import ExplanationCard from '../components/analysis/ExplanationCard';
import Modal from '../components/common/Modal';
import '../styles/analysis.css';

export default function ReportAnalysis() {
  const { t } = useT();
  const navigate = useNavigate();
  const { recordId: pathRecordId } = useParams();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { demoMode } = useBackend();

  const queryRecordId = searchParams.get('reportId');
  const targetId = pathRecordId || queryRecordId || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeResultId, setActiveResultId] = useState(null);
  const [mobileTab, setMobileTab] = useState('extracted'); // 'original' | 'extracted'
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [modalEditValues, setModalEditValues] = useState({});
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  // Load record from live API or mock
  const fetchReport = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    // If in demo mode
    if (demoMode) {
      try {
        const mockRec = await mockService.getReportAnalysis(targetId || 'REP-2026-10-04');
        if (signal?.aborted) return;
        setRecord(mockRec);
        setIsDemo(true);
        if (mockRec.results?.length > 0) {
          setActiveResultId(mockRec.results[0].id || 'res-1');
        }
      } catch (err) {
        if (!signal?.aborted) setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
      return;
    }

    // Live API mode
    try {
      let recIdToLoad = targetId;
      if (!recIdToLoad) {
        // If no ID passed, get newest record
        const recList = await listRecords({ sort: 'newest' }, signal);
        if (recList && recList.length > 0) {
          recIdToLoad = recList[0].id;
        }
      }

      if (recIdToLoad) {
        try {
          const liveRec = await getRecord(recIdToLoad, signal);
          if (signal?.aborted) return;
          // Ensure documentUrl is set for original preview
          const recWithDoc = {
            ...liveRec,
            documentUrl: liveRec.documentUrl || recordFileUrl(recIdToLoad),
            results: (liveRec.results || []).map((r, i) => ({
              ...r,
              id: r.id || `res-${i + 1}`,
              explanation: (liveRec.explanations || []).find((e) => e.test === r.test) || {
                whatMeasures: `${r.test} is assessed in this clinical report.`,
                vsRange: `Result ${r.value} ${r.unit || ''} compared to reference ${r.refLow}–${r.refHigh}.`,
                possibilities: 'Clinical variations reflect metabolic or systemic factors.',
                possibilitiesNote: 'These are possibilities, not a diagnosis.',
                factors: 'Hydration status, meal timing, acute stress.',
                questions: ['What does this reading signify in my clinical history?'],
                nextStep: 'Discuss this result with a qualified healthcare professional.'
              }
            }))
          };
          setRecord(recWithDoc);
          setIsDemo(false);
          if (recWithDoc.results?.length > 0) {
            setActiveResultId(recWithDoc.results[0].id);
          }
        } catch (fetchErr) {
          // If specific record not found or network failed, fallback gracefully to mock with Demo tag
          if (fetchErr.code === 'BACKEND_OFFLINE' || fetchErr.status === 404) {
            const mockRec = await mockService.getReportAnalysis(recIdToLoad || 'REP-2026-10-04');
            setRecord(mockRec);
            setIsDemo(true);
            if (mockRec.results?.length > 0) {
              setActiveResultId(mockRec.results[0].id || 'res-1');
            }
          } else {
            throw fetchErr;
          }
        }
      } else {
        // No records in backend at all: fallback to mock demo
        const mockRec = await mockService.getReportAnalysis('REP-2026-10-04');
        setRecord(mockRec);
        setIsDemo(true);
        if (mockRec.results?.length > 0) {
          setActiveResultId(mockRec.results[0].id || 'res-1');
        }
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'Failed to load report analysis.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [targetId, demoMode]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReport(controller.signal);
    return () => controller.abort();
  }, [fetchReport]);

  // Handle value correction (PATCH /api/records/{id}/results)
  const handleUpdateExtractedValue = async (resId, updatedFields) => {
    if (!record) return;

    const updatedResults = (record.results || []).map((r) => {
      if (r.id === resId || r.test === resId) {
        return {
          ...r,
          ...updatedFields,
          edited: true
        };
      }
      return r;
    });

    if (isDemo || demoMode) {
      // Local state update in demo mode
      setRecord((prev) => ({
        ...prev,
        results: updatedResults
      }));
      addToast({
        type: 'success',
        title: 'Value Updated',
        message: 'Status and explanations updated locally.'
      });
      return;
    }

    try {
      setIsSavingCorrection(true);
      const payload = updatedResults.map((r) => ({
        test: r.test,
        value: Number(r.value),
        unit: r.unit || null,
        refLow: r.refLow != null ? Number(r.refLow) : null,
        refHigh: r.refHigh != null ? Number(r.refHigh) : null
      }));

      const res = await correctResults(record.id, payload);
      // Backend returns full updated record with recomputed explanations and summary
      setRecord({
        ...res,
        documentUrl: res.documentUrl || recordFileUrl(record.id),
        results: (res.results || []).map((r, i) => ({
          ...r,
          id: r.id || `res-${i + 1}`,
          explanation: (res.explanations || []).find((e) => e.test === r.test) || {
            whatMeasures: `${r.test} is assessed in this clinical report.`,
            vsRange: `Result ${r.value} ${r.unit || ''} compared to reference ${r.refLow}–${r.refHigh}.`,
            possibilities: 'Clinical variations reflect metabolic or systemic factors.',
            possibilitiesNote: 'These are possibilities, not a diagnosis.',
            factors: 'Hydration status, meal timing, acute stress.',
            questions: ['What does this reading signify in my clinical history?'],
            nextStep: 'Discuss this result with a qualified healthcare professional.'
          }
        }))
      });

      addToast({
        type: 'success',
        title: 'Values Updated & Recomputed',
        message: 'Backend calibrated status badges and explanations.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Correction Failed',
        message: err.message || 'Could not update results.'
      });
    } finally {
      setIsSavingCorrection(false);
    }
  };

  // 1. Ask AI About This Report
  const handleAskAI = () => {
    if (record?.id) {
      navigate(`/assistant?reportId=${record.id}`);
    } else {
      navigate('/assistant');
    }
  };

  // 2. Save to Health Timeline (record is already saved in backend, notify user)
  const handleSaveToTimeline = () => {
    addToast({
      type: 'success',
      title: 'Saved to Timeline',
      message: 'This report is recorded in your Health Timeline.',
      action: {
        label: 'View Timeline',
        onClick: () => navigate('/timeline')
      }
    });
  };

  // 3. Download Summary as File (.txt)
  const handleDownloadSummary = () => {
    if (!record) return;
    const lines = [
      `=========================================================`,
      `CAREPILOT AI — CLINICAL REPORT SUMMARY`,
      `Report: ${record.typeLabel || record.type || 'Lab Report'}`,
      `Document: ${record.filename || 'Report'}`,
      `Date: ${record.date || new Date().toISOString().slice(0, 10)}`,
      `Status: ${record.status || 'analyzed'}`,
      `Generated: ${new Date().toLocaleString()}`,
      `=========================================================`,
      ``,
      `EXTRACTED BIOMARKER VALUES:`,
      `---------------------------------------------------------`,
      ...(record.results || []).map((r) =>
        `- ${r.test.padEnd(32)} : ${String(r.value).padStart(6)} ${(r.unit || '').padEnd(8)} [Ref: ${r.refLow || 'N/A'}-${r.refHigh || 'N/A'}] (${r.status})`
      ),
      ``,
      `CLINICAL SUMMARY:`,
      `---------------------------------------------------------`,
      typeof record.summary === 'string'
        ? record.summary
        : record.summary?.text || 'Review out-of-range indicators with a clinician.',
      ``,
      `=========================================================`,
      `DISCLAIMER: ${record.disclaimer || 'Informational only. Not a diagnosis or a substitute for professional medical advice.'}`,
      `=========================================================`
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CarePilot_Summary_${record.id || 'Report'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Summary Downloaded',
      message: `Saved as CarePilot_Summary_${record.id || 'Report'}.txt`
    });
  };

  // 4. Copy FHIR JSON Bundle (from backend exportFhir or fallback mock)
  const handleCopyFhir = async () => {
    try {
      let fhirBundle;
      if (!isDemo && !demoMode) {
        try {
          fhirBundle = await exportFhir();
        } catch {
          fhirBundle = generateFhirBundle(undefined, record);
        }
      } else {
        fhirBundle = generateFhirBundle(undefined, record);
      }

      const jsonStr = JSON.stringify(fhirBundle, null, 2);
      await navigator.clipboard.writeText(jsonStr);

      addToast({
        type: 'info',
        title: 'FHIR R4 Bundle Copied',
        message: 'Valid Observation/Condition bundle copied to clipboard.'
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Clipboard Error',
        message: 'Failed to copy FHIR JSON.'
      });
    }
  };

  // Bulk review modal opener
  const handleOpenReviewModal = () => {
    if (!record) return;
    const initialMap = {};
    (record.results || []).forEach((r) => {
      initialMap[r.id || r.test] = { value: r.value, refLow: r.refLow, refHigh: r.refHigh };
    });
    setModalEditValues(initialMap);
    setIsReviewModalOpen(true);
  };

  const handleSaveReviewModal = async () => {
    if (!record) return;
    setIsReviewModalOpen(false);

    const updated = (record.results || []).map((r) => {
      const vals = modalEditValues[r.id || r.test];
      if (vals) {
        return {
          ...r,
          value: Number(vals.value),
          refLow: vals.refLow != null ? Number(vals.refLow) : r.refLow,
          refHigh: vals.refHigh != null ? Number(vals.refHigh) : r.refHigh,
          edited: true
        };
      }
      return r;
    });

    if (isDemo || demoMode) {
      setRecord((prev) => ({ ...prev, results: updated }));
      addToast({
        type: 'success',
        title: 'Values Updated',
        message: 'All edited values updated.'
      });
    } else {
      try {
        const payload = updated.map((r) => ({
          test: r.test,
          value: Number(r.value),
          unit: r.unit || null,
          refLow: r.refLow != null ? Number(r.refLow) : null,
          refHigh: r.refHigh != null ? Number(r.refHigh) : null
        }));
        const res = await correctResults(record.id, payload);
        setRecord({
          ...res,
          documentUrl: res.documentUrl || recordFileUrl(record.id),
          results: (res.results || []).map((r, i) => ({
            ...r,
            id: r.id || `res-${i + 1}`,
            explanation: (res.explanations || []).find((e) => e.test === r.test)
          }))
        });
        addToast({
          type: 'success',
          title: 'All Values Calibrated',
          message: 'Saved to backend database.'
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: err.message
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="analysis-container">
        <div className="surface-card" style={{ height: '140px', background: 'rgba(255,255,255,0.03)' }} />
        <div className="analysis-two-pane">
          <div className="analysis-pane-left surface-card" style={{ height: '500px', background: 'rgba(255,255,255,0.02)' }} />
          <div className="analysis-pane-right surface-card" style={{ height: '500px', background: 'rgba(255,255,255,0.02)' }} />
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="surface-card" style={{ padding: '48px', textAlign: 'center', borderColor: 'var(--color-critical)' }}>
        <AlertTriangle size={42} color="var(--color-critical)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>Failed to Load Report</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 20px' }}>{error || 'Record could not be retrieved.'}</p>
        <button className="btn btn-primary" onClick={() => fetchReport()}>
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const results = record.results || [];
  const urgentResult = results.find((r) => r.critical || r.isUrgent);

  return (
    <div className="analysis-container">
      {/* 1. Report Header Card */}
      <div className="surface-card analysis-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span className="badge badge-normal">
              <ShieldCheck size={13} /> {record.status === 'analyzed' ? 'Verified Analysis' : 'Review Required'}
            </span>
            <span className="badge badge-ocr">{t('analysis.ocrFact')}</span>
            {isDemo && <span className="badge badge-warning">Demo</span>}
          </div>

          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {record.typeLabel || record.type || record.reportType || 'Lab Report'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building size={15} color="var(--color-cyan)" />
              <span>{record.labName || 'Clinical Diagnostics Laboratory'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={15} color="var(--color-cyan)" />
              <span>{record.date || record.specimenDate || 'Recent'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <User size={15} color="var(--color-cyan)" />
              <span>File: <strong>{record.filename || 'Report Document'}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="analysis-action-bar">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleOpenReviewModal}
            id="review-extracted-values-btn"
          >
            <Edit3 size={15} />
            <span>{t('analysis.reviewValues')}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleAskAI}
            id="ask-ai-report-btn"
          >
            <MessageSquareText size={15} />
            <span>{t('analysis.btnAsk')}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSaveToTimeline}
            id="save-timeline-btn"
          >
            <CalendarPlus size={15} />
            <span>{t('analysis.btnSaveTimeline')}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadSummary}
            id="download-summary-btn"
          >
            <Download size={15} />
            <span>{t('analysis.btnDownload')}</span>
          </button>

          <button
            className="btn btn-outline btn-sm"
            onClick={handleCopyFhir}
            id="copy-fhir-btn"
          >
            <Copy size={15} />
            <span>{t('analysis.btnFhir')}</span>
          </button>
        </div>
      </div>

      {/* Warning banner if backend reported low confidence / empty extract */}
      {record.warning && (
        <div
          className="surface-card"
          style={{
            borderColor: 'var(--color-warning)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'rgb(251, 191, 36)'
          }}
        >
          <AlertTriangle size={18} />
          <span style={{ fontSize: '13px' }}>{record.warning}</span>
        </div>
      )}

      {/* Critical / Urgent banner if urgent biomarker detected */}
      {urgentResult && (
        <div
          className="surface-card"
          style={{
            borderColor: 'var(--color-critical)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--color-critical)'
          }}
        >
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13px' }}>
            <strong>Urgent Value Detected:</strong> {urgentResult.test} ({urgentResult.value} {urgentResult.unit || ''}).
            {' '}{urgentResult.explanation?.urgentMessage || "This value looks outside the usual range. Contact a doctor promptly, or emergency services if you feel unwell."}
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="tab-list pane-switcher">
        <button
          className={`tab-btn ${mobileTab === 'extracted' ? 'active' : ''}`}
          onClick={() => setMobileTab('extracted')}
        >
          {t('analysis.tabExtracted')}
        </button>
        <button
          className={`tab-btn ${mobileTab === 'original' ? 'active' : ''}`}
          onClick={() => setMobileTab('original')}
        >
          {t('analysis.tabOriginal')}
        </button>
      </div>

      {/* 2. Two-Pane Layout */}
      <div className="analysis-two-pane">
        {/* Left Pane: Original Document Preview */}
        <div className={`analysis-pane-left ${mobileTab !== 'original' ? 'mobile-hidden' : ''}`}>
          <DocumentViewer
            report={record}
            activeResultId={activeResultId}
            onSelectResult={(id) => setActiveResultId(id)}
          />
        </div>

        {/* Right Pane: Extracted Values & Structured Explanations */}
        <div
          className={`analysis-pane-right ${mobileTab !== 'extracted' ? 'mobile-hidden' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
        >
          {/* Extracted Values Table */}
          <ValuesTable
            results={results}
            activeResultId={activeResultId}
            onSelectResult={(id) => setActiveResultId(id)}
            onUpdateValue={handleUpdateExtractedValue}
          />

          {/* Structured Clinical Explanations Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  Plain-Language Explanations
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                  Structured medical interpretation with doctor discussion questions.
                </span>
              </div>
              <span className="badge badge-ai">{t('analysis.aiExplanation')}</span>
            </div>

            {/* Explanation Accordion Cards */}
            {results.map((res) => {
              const isAbnormal = res.status === 'high' || res.status === 'low' || res.status === 'critical' || res.status === 'High' || res.status === 'Low' || res.status === 'Critical';
              return (
                <ExplanationCard
                  key={res.id || res.test}
                  result={res}
                  isOpenDefault={isAbnormal || res.id === activeResultId}
                  isSelected={res.id === activeResultId}
                  onToggle={() => setActiveResultId(res.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Sticky Clinical Disclaimer Footer */}
      <footer className="clinical-disclaimer-footer" role="contentinfo">
        <HelpCircle size={15} color="var(--color-cyan)" />
        <span>{record.disclaimer || t('disclaimerSticky')}</span>
      </footer>

      {/* Review Modal for Bulk Corrections */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review & Calibrate Extracted Values"
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveReviewModal} disabled={isSavingCorrection}>
              {isSavingCorrection ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
          {results.map((r) => {
            const vals = modalEditValues[r.id || r.test] || { value: r.value, refLow: r.refLow, refHigh: r.refHigh };
            return (
              <div
                key={r.id || r.test}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{r.test}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', display: 'block' }}>
                    Unit: {r.unit || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="any"
                    value={vals.value}
                    onChange={(e) =>
                      setModalEditValues((prev) => ({
                        ...prev,
                        [r.id || r.test]: { ...vals, value: e.target.value }
                      }))
                    }
                    className="input-text"
                    style={{ width: '80px', padding: '4px 6px', fontSize: '12px' }}
                    aria-label={`Value for ${r.test}`}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Range:</span>
                  <input
                    type="number"
                    step="any"
                    value={vals.refLow ?? ''}
                    onChange={(e) =>
                      setModalEditValues((prev) => ({
                        ...prev,
                        [r.id || r.test]: { ...vals, refLow: e.target.value }
                      }))
                    }
                    className="input-text"
                    style={{ width: '60px', padding: '4px 6px', fontSize: '12px' }}
                    placeholder="Low"
                    aria-label={`Low range for ${r.test}`}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    step="any"
                    value={vals.refHigh ?? ''}
                    onChange={(e) =>
                      setModalEditValues((prev) => ({
                        ...prev,
                        [r.id || r.test]: { ...vals, refHigh: e.target.value }
                      }))
                    }
                    className="input-text"
                    style={{ width: '60px', padding: '4px 6px', fontSize: '12px' }}
                    placeholder="High"
                    aria-label={`High range for ${r.test}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
