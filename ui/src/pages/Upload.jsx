import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  FileText,
  FileCheck2,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  ArrowRight
} from 'lucide-react';
import { useT } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { useBackend } from '../context/BackendContext';
import { uploadRecord, analyzeReport } from '../services/api';
import Modal from '../components/common/Modal';
import '../styles/upload.css';

const TYPE_MAP = {
  'Lab Report': 'lab_report',
  'Prescription': 'prescription',
  'Discharge Summary': 'discharge_summary',
  'Diagnostic Report': 'diagnostic_report'
};

export default function Upload() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { demoMode } = useBackend();

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [documentType, setDocumentType] = useState('Lab Report');
  const [hasConsent, setHasConsent] = useState(false);
  const [clientValidationError, setClientValidationError] = useState('');
  const [serverError, setServerError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Stepper state: 0 = idle, 1 = Uploading, 2 = Extracting text, 3 = Identifying info, 4 = Preparing explanation, 5 = Done
  const [processingStep, setProcessingStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Clean up object URLs and camera streams on unmount
  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fileUrl, cameraStream]);

  // Client-side file validation (PDF, JPG, PNG up to 10MB)
  const validateAndSetFile = (file) => {
    setClientValidationError('');
    setServerError('');
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const fileName = file.name || '';
    const hasAllowedExt = /\.(pdf|jpe?g|png)$/i.test(fileName);

    if (!allowedTypes.includes(file.type) && !hasAllowedExt) {
      setClientValidationError('Unsupported format. Please upload a PDF, JPG, or PNG document.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      setClientValidationError('File exceeds the 10MB limit. Please upload a smaller document.');
      return;
    }

    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setFileUrl(url);
    addToast({
      type: 'info',
      title: 'Document Loaded',
      message: `${file.name} ready for processing.`
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Camera handlers
  const handleOpenCamera = async () => {
    setIsCameraOpen(true);
    setCameraError('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('Camera API is not supported on this browser or platform.');
      }
    } catch {
      setCameraError('Unable to access camera. Please check camera permissions or upload a saved file.');
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const snapshotFile = new File([blob], `Camera_Doc_${Date.now()}.jpg`, { type: 'image/jpeg' });
        validateAndSetFile(snapshotFile);
        handleCloseCamera();
      }
    }, 'image/jpeg');
  };

  // Execute upload and analysis
  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      setClientValidationError('Please select or capture a medical document first.');
      return;
    }
    if (!hasConsent) {
      setClientValidationError('Please check the consent box before starting processing.');
      return;
    }

    setServerError('');
    setClientValidationError('');
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (demoMode) {
        setProcessingStep(1);
        await new Promise((r) => setTimeout(r, 300));
        setProcessingStep(2);
        await new Promise((r) => setTimeout(r, 350));
        setProcessingStep(3);
        await new Promise((r) => setTimeout(r, 350));
        setProcessingStep(4);
        await new Promise((r) => setTimeout(r, 300));
        setProcessingStep(5);
        addToast({
          type: 'success',
          title: 'Demo Analysis Complete',
          message: 'Demonstration report processed. Navigating to analysis...'
        });
        setTimeout(() => {
          navigate('/analysis/REP-2026-10-04');
        }, 400);
        return;
      }

      // Step 1: Uploading document securely
      setProcessingStep(1);
      const backendType = TYPE_MAP[documentType] || 'lab_report';
      const uploadRes = await uploadRecord(selectedFile, backendType, hasConsent, signal);

      const recordId = uploadRes?.id || uploadRes?.record_id;
      if (!recordId) {
        throw new Error("Server did not return a valid record ID.");
      }

      // Step 2: Extracting text (OCR)
      setProcessingStep(2);
      await new Promise((r) => setTimeout(r, 200));

      // Step 3: Identifying medical information & analyzing
      setProcessingStep(3);
      await analyzeReport(recordId, lang || 'en', signal);

      // Step 4: Preparing explanation
      setProcessingStep(4);
      await new Promise((r) => setTimeout(r, 300));
      setProcessingStep(5);

      addToast({
        type: 'success',
        title: 'Analysis Complete',
        message: 'Report processed successfully. Navigating to analysis page...'
      });

      // Navigate to /analysis/:recordId
      setTimeout(() => {
        navigate(`/analysis/${recordId}`);
      }, 400);
    } catch (err) {
      if (signal?.aborted) return;

      if (err.code === 'BACKEND_OFFLINE') {
        setProcessingStep(2);
        await new Promise((r) => setTimeout(r, 250));
        setProcessingStep(3);
        await new Promise((r) => setTimeout(r, 250));
        setProcessingStep(4);
        await new Promise((r) => setTimeout(r, 250));
        setProcessingStep(5);
        addToast({
          type: 'info',
          title: 'Demo Mode (Backend Offline)',
          message: 'Backend is offline. Redirecting to demonstration report analysis.'
        });
        setTimeout(() => {
          navigate('/analysis/REP-2026-10-04');
        }, 500);
        return;
      }

      setIsProcessing(false);
      setProcessingStep(0);
      const msg = err.message || "Failed to process document.";
      setServerError(msg);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: msg
      });
    }
  };

  const steps = [
    { num: 1, title: t('upload.step1') },
    { num: 2, title: t('upload.step2') },
    { num: 3, title: t('upload.step3') },
    { num: 4, title: t('upload.step4') }
  ];

  return (
    <div className="upload-container">
      {/* 1. Header */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
          {t('upload.title')}
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {t('upload.subtitle')}
        </p>
      </div>

      {/* Backend Offline Warning Banner */}
      {demoMode && (
        <div
          className="chat-banner"
          style={{
            borderColor: 'var(--color-warning)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: 'rgb(251, 191, 36)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="var(--color-warning)" />
            <span>
              Backend is currently offline on http://localhost:8000. Start the FastAPI server to process real documents.
            </span>
          </div>
        </div>
      )}

      {/* Server Error Banner with Retry */}
      {serverError && (
        <div
          className="surface-card"
          style={{
            borderColor: 'var(--color-critical)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} color="var(--color-critical)" />
            <div>
              <strong style={{ color: 'var(--color-critical)', fontSize: '14px', display: 'block' }}>
                Document Processing Error
              </strong>
              <span style={{ color: 'var(--color-text)', fontSize: '13px' }}>{serverError}</span>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleStartAnalysis}
            disabled={isProcessing}
            style={{ borderColor: 'var(--color-critical)', color: 'var(--color-critical)' }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Client Validation Error */}
      {clientValidationError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-critical)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>{clientValidationError}</span>
        </div>
      )}

      {/* 2. Drag-and-Drop Area & Preview */}
      {!selectedFile ? (
        <div
          className={`dropzone-card ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload document dropzone"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                validateAndSetFile(e.target.files[0]);
              }
            }}
          />

          <div className="dropzone-icon-circle">
            <UploadCloud size={32} color="var(--color-cyan)" />
          </div>

          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text)', margin: '12px 0 4px' }}>
            {t('upload.dragDrop')}
          </h3>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              id="browse-files-btn"
            >
              <FileText size={15} />
              <span>{t('upload.browseFiles')}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCamera();
              }}
              id="open-camera-btn"
            >
              <Camera size={15} />
              <span>{t('upload.cameraCapture')}</span>
            </button>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '16px' }}>
            {t('upload.formatsAllowed')}
          </span>
        </div>
      ) : (
        <div className="surface-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(53, 214, 232, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FileCheck2 size={24} color="var(--color-cyan)" />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  {selectedFile.name}
                </h4>
                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Document'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileUrl) URL.revokeObjectURL(fileUrl);
                  setFileUrl(null);
                  setProcessingStep(0);
                  setIsProcessing(false);
                }}
                disabled={isProcessing}
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Document Type & Consent Selection */}
      <div className="surface-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '16px' }}>
          {t('upload.recordTypeLabel')}
        </h3>

        <div className="type-chips-grid">
          {Object.keys(TYPE_MAP).map((type) => (
            <button
              key={type}
              type="button"
              className={`type-chip-btn ${documentType === type ? 'active' : ''}`}
              onClick={() => setDocumentType(type)}
              disabled={isProcessing}
            >
              <FileText size={16} />
              <span>{type}</span>
            </button>
          ))}
        </div>

        {/* Consent Checkbox */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={(e) => {
                setHasConsent(e.target.checked);
                if (e.target.checked) setClientValidationError('');
              }}
              disabled={isProcessing}
              style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--color-cyan)', cursor: 'pointer' }}
              id="upload-consent-checkbox"
            />
            <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text)' }}>
              <strong>{t('upload.consentLabel')}</strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                I understand this analysis is for health literacy and informational purposes only. It is not a clinical diagnosis or a prescription order.
              </div>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleStartAnalysis}
            disabled={!selectedFile || !hasConsent || isProcessing}
            id="start-ai-analysis-btn"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Processing Report...</span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>{t('upload.btnStart')}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Real 4-Step Stepper */}
      {isProcessing && (
        <div className="surface-card stepper-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Loader2 size={18} className="spin-animation" color="var(--color-cyan)" />
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              Live Processing in Progress
            </h4>
          </div>

          <div className="stepper-track">
            {steps.map((st) => {
              const isCompleted = processingStep > st.num;
              const isCurrent = processingStep === st.num;
              return (
                <div key={st.num} className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}>
                  <div className="stepper-dot">
                    {isCompleted ? <CheckCircle2 size={14} /> : st.num}
                  </div>
                  <span className="stepper-label">{st.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <Modal
        isOpen={isCameraOpen}
        onClose={handleCloseCamera}
        title="Capture Document Photo"
        maxWidth="640px"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handleCloseCamera}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCaptureSnapshot}>
              <Camera size={16} />
              <span>Capture Photo</span>
            </button>
          </div>
        }
      >
        <div>
          {cameraError ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-critical)' }}>
              {cameraError}
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '360px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
