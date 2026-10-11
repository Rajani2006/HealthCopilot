import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';

export default function DocumentViewer({ report, activeResultId, onSelectResult }) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const hasRealFile = Boolean(report?.documentUrl && report?.fileKind);

  return (
    <div className="surface-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '620px' }}>
      {/* Document Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: 'var(--color-surface-raised)',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <FileText size={16} color="var(--color-cyan)" />
          <span>{report?.filename ? `${report.filename}` : "Original Document Preview"}</span>
          <span className="badge badge-ocr">
            {hasRealFile ? `${(report.fileKind || 'file').toUpperCase()} Preview` : "OCR Calibrated"}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleZoomOut}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', minWidth: '44px', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleZoomIn}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleResetZoom}
            aria-label="Reset zoom"
            title="Reset zoom"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Interactive Document Viewport */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#050b14',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '24px 16px',
          position: 'relative'
        }}
      >
        {hasRealFile ? (
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 150ms ease',
              width: '100%',
              maxWidth: '680px',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            {report.fileKind === 'pdf' ? (
              <iframe
                src={report.documentUrl}
                style={{
                  width: '100%',
                  height: '760px',
                  border: 'none',
                  borderRadius: '4px',
                  boxShadow: '0 10px 35px rgba(0,0,0,0.6)'
                }}
                title="Original PDF Document"
              />
            ) : (
              <img
                src={report.documentUrl}
                alt={report.filename || "Original Document"}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '4px',
                  boxShadow: '0 10px 35px rgba(0,0,0,0.6)'
                }}
              />
            )}
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 150ms ease',
              width: '560px',
              minHeight: '780px',
              backgroundColor: '#ffffff',
              color: '#1a202c',
              borderRadius: '4px',
              boxShadow: '0 10px 35px rgba(0,0,0,0.6)',
              padding: '36px 32px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '11px',
              lineHeight: '1.4',
              position: 'relative',
              userSelect: 'none'
            }}
          >
            {/* Laboratory Letterhead */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #2b6cb0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#1a365d', margin: 0, letterSpacing: '-0.01em' }}>
                  {report?.labName || "APEX DIAGNOSTICS & RESEARCH LAB"}
                </h2>
                <p style={{ margin: '2px 0 0', color: '#4a5568', fontSize: '10px' }}>
                  Accredited NABL ISO 15189:2022 • Reg No: APX-98214-DEL
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '10px', color: '#4a5568' }}>
                <p style={{ margin: 0 }}>Date: <strong>{report?.date || report?.specimenDate || "2026-10-04"}</strong></p>
                <p style={{ margin: '2px 0 0' }}>Report ID: <strong>{report?.id || "REP-2026-10-04"}</strong></p>
              </div>
            </div>

            {/* Specimen / Patient Demographics Strip */}
            <div style={{ backgroundColor: '#ebf8ff', padding: '10px 14px', borderRadius: '4px', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '10.5px' }}>
              <div>
                <span style={{ color: '#4a5568' }}>Patient Initials:</span> <strong>{report?.patientInitials || "A.K."}</strong>
              </div>
              <div>
                <span style={{ color: '#4a5568' }}>Age / Gender:</span> <strong>{report?.patientAgeGender || "42Y / M"}</strong>
              </div>
              <div>
                <span style={{ color: '#4a5568' }}>Specimen:</span> <strong>{report?.specimenType || "Venous Blood"}</strong>
              </div>
              <div>
                <span style={{ color: '#4a5568' }}>Fasting Status:</span> <strong>{report?.fastingStatus || "Fasting (10h)"}</strong>
              </div>
              <div>
                <span style={{ color: '#4a5568' }}>Ref Doctor:</span> <strong>Dr. R. Sharma, MD</strong>
              </div>
              <div>
                <span style={{ color: '#4a5568' }}>Collected at:</span> <strong>Central Phlebotomy</strong>
              </div>
            </div>

            {/* Header title */}
            <div style={{ textAlign: 'center', marginBottom: '14px', borderBottom: '1px solid #cbd5e0', paddingBottom: '6px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {report?.typeLabel || report?.reportType || "COMPREHENSIVE METABOLIC & LIPID PROFILE"}
              </h3>
            </div>

            {/* Simulated Lab Results Listing */}
            <div style={{ position: 'relative', marginTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr', fontWeight: 700, borderBottom: '1.5px solid #4a5568', paddingBottom: '4px', color: '#2d3748', fontSize: '10px' }}>
                <span>INVESTIGATION / TEST</span>
                <span style={{ textAlign: 'right' }}>RESULT</span>
                <span style={{ textAlign: 'center' }}>UNIT</span>
                <span style={{ textAlign: 'right' }}>BIOLOGICAL REF</span>
              </div>

              {(report?.results || []).map((res) => {
                const isSelected = activeResultId === res.id;
                const isAbnormal = res.status === 'High' || res.status === 'Low' || res.status === 'Critical' || res.status === 'high' || res.status === 'low';

                return (
                  <div
                    key={res.id || res.test}
                    onClick={() => onSelectResult && onSelectResult(res.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
                      padding: '5px 4px',
                      borderBottom: '1px dotted #e2e8f0',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(49, 130, 206, 0.18)' : 'transparent',
                      borderRadius: '2px',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontWeight: 500, color: '#1a202c' }}>{res.test}</span>
                    <span style={{ textAlign: 'right', fontWeight: isAbnormal ? 800 : 600, color: isAbnormal ? '#c53030' : '#2b6cb0' }}>
                      {res.value} {isAbnormal ? '*' : ''}
                    </span>
                    <span style={{ textAlign: 'center', color: '#718096' }}>{res.unit}</span>
                    <span style={{ textAlign: 'right', color: '#4a5568' }}>
                      {res.refLow != null && res.refHigh != null ? `${res.refLow} - ${res.refHigh}` : '—'}
                    </span>

                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        right: '-8px',
                        top: '-10px',
                        backgroundColor: '#0987a0',
                        color: '#fff',
                        fontSize: '8px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        pointerEvents: 'none'
                      }}>
                        OCR MATCH ({Math.round((res.confidence || 0.98) * 100)}%)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Report Footer / Signature */}
            <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '9px', color: '#718096' }}>
              <div>
                <p style={{ margin: 0 }}>* Asterisk indicates value outside normal biological reference interval.</p>
                <p style={{ margin: '2px 0 0' }}>Methodology: Hexokinase / Enzymatic / Immunoturbidimetry assay.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#2d3748' }}>Dr. Ananya Sen, MD (Pathology)</p>
                <p style={{ margin: '1px 0 0' }}>Consultant Pathologist & Lab Director</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
