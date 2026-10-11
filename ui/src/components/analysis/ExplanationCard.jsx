import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  Stethoscope,
  Sparkles,
  Info
} from 'lucide-react';
import { useT } from '../../i18n/I18nContext';
import { useToast } from '../../context/ToastContext';

export default function ExplanationCard({
  result,
  isOpenDefault = false,
  isSelected = false,
  onToggle
}) {
  const { t } = useT();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [copiedQuestion, setCopiedQuestion] = useState(null);

  const exp = result.explanation || {};
  const statusStr = (result.status || 'normal').toLowerCase();
  const isAbnormal = statusStr === 'high' || statusStr === 'low' || statusStr === 'critical';
  const isCritical = statusStr === 'critical' || Boolean(result.critical || result.isUrgent);
  const isVerification = statusStr === 'needs_verification' || statusStr === 'needs verification';

  const possibilities = Array.isArray(exp.possibilities)
    ? exp.possibilities.join(', ')
    : exp.possibilities || 'Clinical variations reflect metabolic or systemic factors.';
  const possibilitiesNote = exp.possibilitiesNote || 'These are possibilities, not a diagnosis.';

  const factors = Array.isArray(exp.factors)
    ? exp.factors.join(', ')
    : (Array.isArray(exp.confounders) ? exp.confounders.join(', ') : exp.factors || exp.confounders || 'Hydration status, meal timing, acute stress.');

  const questions = exp.questions || exp.doctorQuestions || [];
  const rangeSourceLabel = result.rangeSource === 'report' ? 'Range from report' : 'General default range';

  const valueTag = exp.tags?.value || (result.edited || result.isEditedByUser ? 'Edited by you' : 'OCR-extracted fact');
  const explanationTag = exp.tags?.explanation || (result.explanation?.source === 'llm' ? 'AI explanation' : 'Medical guideline explanation');

  const handleCopyQuestion = (questionText, index, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(questionText);
    setCopiedQuestion(index);
    addToast({
      type: 'info',
      title: 'Question Copied',
      message: 'Ready to share with your doctor.'
    });
    setTimeout(() => setCopiedQuestion(null), 2500);
  };

  return (
    <div
      className="surface-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: isSelected
          ? '1px solid var(--color-cyan)'
          : isCritical
          ? '1px solid var(--color-critical)'
          : isAbnormal
          ? '1px solid rgba(245, 185, 66, 0.3)'
          : isVerification
          ? '1px solid rgba(148, 163, 184, 0.3)'
          : '1px solid var(--color-border)',
        boxShadow: isSelected ? '0 0 12px var(--color-cyan-glow)' : 'none',
        transition: 'all 200ms ease'
      }}
    >
      {/* Header Bar */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (onToggle) onToggle();
        }}
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: isOpen ? 'var(--color-surface-raised)' : 'transparent',
          transition: 'background-color 150ms ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '15px', color: 'var(--color-text)' }}>{result.test}</strong>
              <span
                className="num"
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isCritical
                    ? 'var(--color-critical)'
                    : isAbnormal
                    ? 'var(--color-warning)'
                    : isVerification
                    ? 'var(--color-text-muted)'
                    : 'var(--color-success)'
                }}
              >
                {result.value} {result.unit}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-text-subtle)'
                }}
              >
                {rangeSourceLabel}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Lab Reference: {result.refLow != null && result.refHigh != null ? `${result.refLow} – ${result.refHigh} ${result.unit || ''}` : 'Standard band'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {statusStr === 'normal' && (
            <span className="badge badge-normal">
              <CheckCircle2 size={12} /> {t('analysis.statusNormal')}
            </span>
          )}
          {statusStr === 'high' && (
            <span className="badge badge-high">
              <AlertTriangle size={12} /> {t('analysis.statusHigh')}
            </span>
          )}
          {statusStr === 'low' && (
            <span className="badge badge-low">
              <AlertTriangle size={12} /> {t('analysis.statusLow')}
            </span>
          )}
          {isCritical && (
            <span className="badge badge-critical">
              <AlertCircle size={12} /> {t('analysis.statusCritical')}
            </span>
          )}
          {isVerification && (
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(148, 163, 184, 0.15)',
                color: '#cbd5e1',
                borderColor: 'rgba(148, 163, 184, 0.3)'
              }}
            >
              <HelpCircle size={12} /> {t('analysis.statusReview')}
            </span>
          )}

          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px' }}
            aria-label={isOpen ? "Collapse explanation" : "Expand explanation"}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Accordion Body */}
      {isOpen && (
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px', borderTop: '1px solid var(--color-border)' }}>
          {/* Urgent Care Banner if critical */}
          {isCritical && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--color-critical-bg)',
                border: '1px solid var(--color-critical-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-critical)',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>
                {exp.urgentMessage || "This value looks far outside the usual range. Contact a doctor promptly, or emergency services if you feel unwell."}
              </span>
            </div>
          )}

          {/* Block 1: What this measures */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {t('analysis.cardWhatMeasures')}
              </span>
              <span className="badge badge-ocr">
                <Info size={11} /> {valueTag}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
              {exp.measures || exp.whatMeasures || `${result.test} is evaluated in this profile.`}
            </p>
          </div>

          {/* Block 2: Your value vs the lab's range */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {t('analysis.cardVsRange')}
              </span>
              <span className="badge badge-ocr">
                <Info size={11} /> {valueTag}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
              {exp.comparison || exp.vsRange || `Your result of ${result.value} ${result.unit || ''} is compared against the reference band.`}
            </p>
          </div>

          {/* Block 3: Possible reasons (possibilities, not a diagnosis) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {t('analysis.cardPossibilities')}
              </span>
              <span className="badge badge-ai">
                <Sparkles size={11} /> {explanationTag}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
              {possibilities}
            </p>
            <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
              {possibilitiesNote}
            </span>
          </div>

          {/* Block 4: Things that can affect this result (factors/confounders) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {t('analysis.cardConfounders')}
              </span>
              <span className="badge badge-ai">
                <Sparkles size={11} /> {explanationTag}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
              {factors}
            </p>
          </div>

          {/* Block 5: Questions to ask your doctor */}
          {questions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {t('analysis.cardQuestions')}
                </span>
                <span className="badge badge-ai">
                  <Stethoscope size={11} /> Clinical Prompts
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-surface-raised)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      color: 'var(--color-text)'
                    }}
                  >
                    <span>"{q}"</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px' }}
                      onClick={(e) => handleCopyQuestion(q, idx, e)}
                      title="Copy question for doctor"
                      aria-label="Copy question"
                    >
                      {copiedQuestion === idx ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block 6: Next step */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid var(--color-cyan)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-cyan)' }}>
              {t('analysis.cardNextStep')}
            </span>
            <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0 }}>
              {exp.nextStep || "Discuss this result with a qualified healthcare professional."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
