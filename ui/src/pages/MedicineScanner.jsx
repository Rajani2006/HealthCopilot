import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Plus,
  BookmarkPlus,
  Loader2,
  ShieldCheck,
  FileText,
  X
} from 'lucide-react';
import { useT } from '../i18n/I18nContext';
import { useHealthData } from '../context/HealthDataContext';
import { useBackend } from '../context/BackendContext';
import { useToast } from '../context/ToastContext';
import { mockService } from '../services/mock';
import { scanMedicineImage } from '../services/api';
import CameraCapture from '../components/CameraCapture';
import Modal from '../components/common/Modal';
import '../styles/scanner.css';

export default function MedicineScanner() {
  const { t } = useT();
  const { addTimelineEvent } = useHealthData();
  const { addToast } = useToast();

  // Scan state: 'idle' | 'analyzing' | 'identified' | 'unidentified' | 'error'
  const [scanState, setScanState] = useState('idle');
  const [analyzingStep, setAnalyzingStep] = useState(1);
  const [resultData, setResultData] = useState(null);
  const [errorState, setErrorState] = useState(null);

  // Captured / uploaded image preview
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const { demoMode } = useBackend();
  const isDemo = demoMode;

  // Manual entry modal state
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualDose, setManualDose] = useState('');
  const [manualExpiry, setManualExpiry] = useState('');
  const [manualFreq, setManualFreq] = useState('');

  const fileInputRef = useRef(null);

  // Cleanup object URL on unmount or URL change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Main file processing handler (from CameraCapture or File input)
  const handleProcessFile = async (file) => {
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCapturedFile(file);
    setScanState('analyzing');
    setAnalyzingStep(1);
    setErrorState(null);

    // 3-step progress transition
    const stepTimer1 = setTimeout(() => setAnalyzingStep(2), 350);
    const stepTimer2 = setTimeout(() => setAnalyzingStep(3), 850);

    try {
      if (demoMode) {
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        await handleRunDemoScan();
        return;
      }

      const data = await scanMedicineImage(file);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalyzingStep(3);
      await new Promise((r) => setTimeout(r, 200));

      if (data && data.status === 'candidate') {
        setResultData({
          ...data,
          isDemo: false
        });
        setScanState('identified');
        addToast({
          type: 'success',
          title: 'Medication Identified',
          message: `${data.possibleName || 'Medication'} verified from package OCR.`
        });
      } else {
        setResultData(data || { status: 'unable_to_identify' });
        setScanState('unidentified');
        addToast({
          type: 'warning',
          title: 'Review Needed',
          message: data?.message || 'Could not verify drug name with high confidence.'
        });
      }
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      console.warn('Medicine scan error:', err);

      if (err.code === 'BACKEND_OFFLINE') {
        // Graceful fallback to demo result
        const demoData = await mockService.scanMedicine();
        setResultData({
          status: 'candidate',
          possibleName: demoData.brandName,
          strength: demoData.strength,
          dosageForm: demoData.form,
          expiry: demoData.expiryDate,
          activeIngredient: demoData.genericName,
          confidence: demoData.ocrConfidence,
          source: 'Demo simulation catalog (Backend offline)',
          verifyNote: 'Verify with the package, your prescription or a pharmacist. No dosage advice is given here.',
          isDemo: true
        });
        setScanState('identified');
        addToast({
          type: 'info',
          title: 'Demo Result Loaded',
          message: 'Backend is offline. Displaying simulated medication identification.'
        });
        return;
      }

      const msg = err.message || 'Backend not connected';
      setErrorState(msg);
      setScanState('error');
      addToast({
        type: 'error',
        title: 'Scan Failed',
        message: msg
      });
    }
  };

  // Upload photo file input change handler
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // Reset file input so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Retake photo handler
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedFile(null);
    setResultData(null);
    setErrorState(null);
    setScanState('idle');
  };

  // Retry scan on current file
  const handleRetry = () => {
    if (capturedFile) {
      handleProcessFile(capturedFile);
    } else {
      handleRetake();
    }
  };

  // Run demo simulation (used if in demo mode or as fallback when backend offline)
  const handleRunDemoScan = async () => {
    setScanState('analyzing');
    setAnalyzingStep(1);
    await new Promise((r) => setTimeout(r, 300));
    setAnalyzingStep(2);
    await new Promise((r) => setTimeout(r, 400));
    setAnalyzingStep(3);
    await new Promise((r) => setTimeout(r, 300));

    const demoData = await mockService.scanMedicine();
    setResultData({
      status: 'candidate',
      possibleName: demoData.brandName,
      strength: demoData.strength,
      dosageForm: demoData.form,
      expiry: demoData.expiryDate,
      activeIngredient: demoData.genericName,
      confidence: demoData.ocrConfidence,
      source: 'Demo simulation catalog',
      verifyNote: 'Verify with the package, your prescription or a pharmacist. No dosage advice is given here.',
      isDemo: true
    });
    setScanState('identified');
    addToast({
      type: 'info',
      title: 'Demo Result Loaded',
      message: 'Demonstration medication record displayed.'
    });
  };

  // Save identified result to timeline
  const handleSaveToTimeline = () => {
    if (!resultData) return;
    addTimelineEvent({
      category: 'prescription',
      title: `Medication Scanned: ${resultData.possibleName || 'Medication'}`,
      source: resultData.isDemo ? 'Medicine Scanner (Demo)' : 'Medicine Scanner (OCR)',
      summary: `${resultData.activeIngredient || ''} (${resultData.strength || 'Standard'}), Form: ${resultData.dosageForm || 'Tablet'}, Expiry: ${resultData.expiry || 'N/A'}`,
      badge: resultData.isDemo ? 'Demo Scan' : 'OCR Scanned',
      badgeType: 'normal'
    });
    addToast({
      type: 'success',
      title: 'Saved to Timeline',
      message: `${resultData.possibleName || 'Medication'} added to your health events.`
    });
  };

  // Save manual entry
  const handleSaveManualEntry = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    addTimelineEvent({
      category: 'prescription',
      title: `Medication Logged: ${manualName.trim()}`,
      source: 'Manual Patient Entry',
      summary: `${manualDose ? `Dose: ${manualDose}. ` : ''}${manualExpiry ? `Expiry: ${manualExpiry}. ` : ''}${manualFreq || 'As directed'}`,
      badge: 'Manual Entry',
      badgeType: 'normal'
    });

    setManualEntryOpen(false);
    setManualName('');
    setManualDose('');
    setManualExpiry('');
    setManualFreq('');
    setScanState('idle');

    addToast({
      type: 'success',
      title: 'Medication Saved',
      message: 'Manual medication record added to timeline.'
    });
  };

  return (
    <div className="scanner-container">
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
          {t('nav.scanner')}
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Scan strip packaging, tablet blisters, or medicine bottles for OCR text extraction and ingredient verification.
        </p>
      </div>

      {/* Mandatory Safety Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-warning)',
          fontSize: '13px'
        }}
      >
        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ display: 'block', fontSize: '13px' }}>Safety Notice</strong>
          <span>Verify with the package, your prescription or a pharmacist. No dosage advice is given here.</span>
        </div>
      </div>

      {/* 1. IDLE STATE: Live CameraCapture & Alternative Action Controls */}
      {scanState === 'idle' && (
        <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Functional Browser Camera Component */}
          <CameraCapture onCapture={handleProcessFile} />

          {/* Secondary / Fallback Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            paddingTop: '8px',
            borderTop: '1px solid var(--color-border)'
          }}>
            {/* Hidden file input supporting mobile camera capture & desktop upload */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              capture="environment"
              onChange={handleFileInputChange}
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              id="upload-photo-btn"
            >
              <UploadCloud size={16} />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setManualEntryOpen(true)}
              id="manual-entry-btn"
            >
              <Plus size={16} />
              <span>Manual Entry</span>
            </button>

            {/* Simulate Scan: only shown in demo mode, clearly labeled */}
            {isDemo && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRunDemoScan}
                id="simulate-scan-demo-btn"
                title="Run mock demo scan"
              >
                <FileText size={16} />
                <span>Simulate Scan (Demo result)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. ANALYZING STATE: Preview + 3-Step Stepper */}
      {scanState === 'analyzing' && (
        <div className="surface-card scan-preview-wrapper" style={{ padding: '36px 24px', width: '100%' }}>
          {previewUrl && (
            <div className="scan-preview-box">
              <img src={previewUrl} alt="Medicine scan preview" className="scan-preview-img" />
            </div>
          )}

          <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
              Analyzing Medicine Package...
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Reading strip typography and cross-referencing pharmaceutical index
            </p>
          </div>

          {/* 3-Step Progress Indicators */}
          <div className="scan-steps">
            <div className={`scan-step-item ${analyzingStep === 1 ? 'active' : analyzingStep > 1 ? 'done' : ''}`}>
              {analyzingStep > 1 ? (
                <CheckCircle2 size={18} color="var(--color-success)" />
              ) : (
                <Loader2 size={18} className="animate-spin" color="var(--color-cyan)" />
              )}
              <span>1. Uploading image</span>
            </div>

            <div className={`scan-step-item ${analyzingStep === 2 ? 'active' : analyzingStep > 2 ? 'done' : ''}`}>
              {analyzingStep > 2 ? (
                <CheckCircle2 size={18} color="var(--color-success)" />
              ) : analyzingStep === 2 ? (
                <Loader2 size={18} className="animate-spin" color="var(--color-cyan)" />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--color-border)' }} />
              )}
              <span>2. Reading text with OCR</span>
            </div>

            <div className={`scan-step-item ${analyzingStep === 3 ? 'active' : analyzingStep > 3 ? 'done' : ''}`}>
              {analyzingStep > 3 ? (
                <CheckCircle2 size={18} color="var(--color-success)" />
              ) : analyzingStep === 3 ? (
                <Loader2 size={18} className="animate-spin" color="var(--color-cyan)" />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--color-border)' }} />
              )}
              <span>3. Matching medicine list</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRetake}
            style={{ marginTop: '12px' }}
            id="cancel-analyzing-btn"
          >
            <X size={14} />
            <span>Cancel & Retake</span>
          </button>
        </div>
      )}

      {/* 3. IDENTIFIED STATE: Candidate Match Result Card */}
      {scanState === 'identified' && resultData && (
        <div className="surface-card medicine-result-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & Badges */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-normal">
                  <CheckCircle2 size={12} /> Confident Match
                </span>
                {resultData.isDemo && (
                  <span className="badge badge-warning">
                    Demo result
                  </span>
                )}
                {resultData.nameType && (
                  <span className="badge badge-ocr" style={{ textTransform: 'capitalize' }}>
                    {resultData.nameType}
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {resultData.possibleName || 'Identified Medication'}
              </h3>
              <span style={{ fontSize: '14px', color: 'var(--color-cyan)', fontWeight: 500 }}>
                {resultData.activeIngredient}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRetake}
                id="retake-scan-btn"
              >
                <RefreshCw size={14} />
                <span>Scan Another</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveToTimeline}
                id="save-scanned-med-btn"
              >
                <BookmarkPlus size={15} />
                <span>Save to Timeline</span>
              </button>
            </div>
          </div>

          {/* Grid of Extracted Fields Driven by Real Backend Response */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Strength
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--color-text)', display: 'block', marginTop: '3px' }}>
                {resultData.strength || 'Not specified on package'}
              </strong>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Dosage Form
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--color-text)', display: 'block', marginTop: '3px' }}>
                {resultData.dosageForm || 'Tablet'}
              </strong>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Expiry Date
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--color-text)', display: 'block', marginTop: '3px' }}>
                {resultData.expiry || 'Not detected on strip'}
              </strong>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Ingredient
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--color-text)', display: 'block', marginTop: '3px' }}>
                {resultData.activeIngredient}
              </strong>
            </div>

            {/* Recognition Confidence with Progress Bar */}
            <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recognition Confidence
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--color-success)', display: 'block', marginTop: '3px' }}>
                {Math.round((resultData.confidence || 0) * 100)}%
              </strong>
              <div className="confidence-bar-container">
                <div
                  className="confidence-bar-fill"
                  style={{ width: `${Math.min(Math.max(Math.round((resultData.confidence || 0) * 100), 10), 100)}%` }}
                />
              </div>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Data Source
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--color-text)', display: 'block', marginTop: '3px' }}>
                {resultData.source || 'FastAPI backend OCR'}
              </strong>
            </div>
          </div>

          {/* Verification Note from Backend */}
          {resultData.verifyNote && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: 'rgba(53, 214, 232, 0.08)',
                border: '1px solid rgba(53, 214, 232, 0.25)',
                borderRadius: '8px',
                color: 'var(--color-text)',
                fontSize: '13px'
              }}
            >
              <ShieldCheck size={18} color="var(--color-cyan)" style={{ flexShrink: 0 }} />
              <span>{resultData.verifyNote}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. UNIDENTIFIED STATE: Low Confidence / Partial Tokens */}
      {scanState === 'unidentified' && (
        <div
          className="surface-card"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            borderLeft: '4px solid var(--color-warning)'
          }}
        >
          <HelpCircle size={46} color="var(--color-warning)" />
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>
              Unable to Identify Confidently
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '520px', marginTop: '4px' }}>
              {resultData?.message || 'Packaging glare, reflection, or curved blister typography prevented high-confidence matching.'}
            </p>
          </div>

          {/* Any partially read text tokens returned by backend */}
          {resultData?.readText && (resultData.readText.strength || resultData.readText.expiry || resultData.readText.form) && (
            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: '12px 16px',
                background: 'var(--color-surface-raised)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-subtle)', display: 'block', marginBottom: '8px' }}>
                Partially Detected Attributes:
              </span>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text)' }}>
                {resultData.readText.strength && (
                  <span><strong>Strength:</strong> {resultData.readText.strength}</span>
                )}
                {resultData.readText.form && (
                  <span><strong>Form:</strong> {resultData.readText.form}</span>
                )}
                {resultData.readText.expiry && (
                  <span><strong>Expiry:</strong> {resultData.readText.expiry}</span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRetake}
              id="retake-photo-btn"
            >
              <RefreshCw size={15} />
              <span>Retake Photo</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setManualEntryOpen(true)}
              id="enter-manually-btn"
            >
              <Plus size={15} />
              <span>Enter Manually</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. ERROR STATE: Network failure or Backend Unreachable */}
      {scanState === 'error' && (
        <div
          className="surface-card"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            borderLeft: '4px solid var(--color-critical)'
          }}
        >
          <AlertTriangle size={46} color="var(--color-critical)" />
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)' }}>
              Backend Not Connected
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '520px', marginTop: '4px' }}>
              {errorState || 'Could not communicate with the CarePilot FastAPI backend service at http://localhost:8000.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetry}
              id="retry-scan-btn"
            >
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRetake}
              id="cancel-error-btn"
            >
              <Camera size={15} />
              <span>Retake Photo</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleRunDemoScan}
              id="fallback-demo-btn"
            >
              <FileText size={15} />
              <span>Use Demo Result</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      <Modal
        isOpen={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        title="Manual Medication Entry"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setManualEntryOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveManualEntry}
              id="save-manual-med-btn"
            >
              Save Medication
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveManualEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="med-name">Medicine Name / Brand *</label>
            <input
              id="med-name"
              type="text"
              className="input-text"
              placeholder="e.g. Metformin 500mg"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="med-dose">Dosage / Strength</label>
            <input
              id="med-dose"
              type="text"
              className="input-text"
              placeholder="e.g. 500 mg Tablet"
              value={manualDose}
              onChange={(e) => setManualDose(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="med-expiry">Expiry Date</label>
            <input
              id="med-expiry"
              type="text"
              className="input-text"
              placeholder="e.g. 12/2027 or Nov 2027"
              value={manualExpiry}
              onChange={(e) => setManualExpiry(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="med-freq">Directions / Frequency</label>
            <input
              id="med-freq"
              type="text"
              className="input-text"
              placeholder="e.g. Once daily after dinner"
              value={manualFreq}
              onChange={(e) => setManualFreq(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
