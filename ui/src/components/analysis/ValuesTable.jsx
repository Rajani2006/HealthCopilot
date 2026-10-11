import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Edit3,
  Check,
  X,
  FileCheck2
} from 'lucide-react';
import { useT } from '../../i18n/I18nContext';
import { useToast } from '../../context/ToastContext';

export default function ValuesTable({
  results,
  activeResultId,
  onSelectResult,
  onUpdateValue
}) {
  const { t } = useT();
  const { addToast } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editRefLow, setEditRefLow] = useState('');
  const [editRefHigh, setEditRefHigh] = useState('');
  const [valError, setValError] = useState('');

  const handleStartEdit = (res, e) => {
    e.stopPropagation();
    setEditingId(res.id);
    setEditValue(String(res.value));
    setEditRefLow(String(res.refLow));
    setEditRefHigh(String(res.refHigh));
    setValError('');
  };

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setValError('');
  };

  const handleSaveEdit = (resId, e) => {
    e.stopPropagation();
    const num = parseFloat(editValue);
    const low = parseFloat(editRefLow);
    const high = parseFloat(editRefHigh);

    if (isNaN(num)) {
      setValError('Please enter a valid numeric value');
      return;
    }
    if (isNaN(low) || isNaN(high)) {
      setValError('Reference bounds must be numbers');
      return;
    }

    onUpdateValue(resId, {
      value: num,
      refLow: low,
      refHigh: high
    });

    setEditingId(null);
    setValError('');
    addToast({
      type: 'success',
      title: 'Value Updated',
      message: 'Result status and explanations automatically recomputed.'
    });
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Normal':
        return (
          <span className="badge badge-normal">
            <CheckCircle2 size={12} />
            {t('analysis.statusNormal')}
          </span>
        );
      case 'High':
        return (
          <span className="badge badge-high">
            <AlertTriangle size={12} />
            {t('analysis.statusHigh')}
          </span>
        );
      case 'Low':
        return (
          <span className="badge badge-low">
            <AlertTriangle size={12} />
            {t('analysis.statusLow')}
          </span>
        );
      case 'Critical':
        return (
          <span className="badge badge-critical">
            <AlertCircle size={12} />
            {t('analysis.statusCritical')}
          </span>
        );
      default:
        return (
          <span className="badge badge-verification">
            <HelpCircle size={12} />
            {t('analysis.statusReview')}
          </span>
        );
    }
  };

  return (
    <div className="surface-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)' }}>
            Extracted Biomarker Values
          </h2>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Extracted via high-accuracy OCR. Select any row to highlight in document or edit.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-ocr">
            <FileCheck2 size={12} />
            {t('analysis.ocrFact')}
          </span>
        </div>
      </div>

      {valError && (
        <div style={{ padding: '8px 12px', background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-critical)' }}>
          {valError}
        </div>
      )}

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 12px' }}>{t('analysis.colTest')}</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('analysis.colValue')}</th>
              <th style={{ padding: '10px 12px' }}>{t('analysis.colUnit')}</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('analysis.colRange')}</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('analysis.colStatus')}</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('analysis.colConfidence')}</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res) => {
              const isSelected = activeResultId === res.id;
              const isEditing = editingId === res.id;

              return (
                <tr
                  key={res.id}
                  onClick={() => onSelectResult(res.id)}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(53, 214, 232, 0.08)' : 'transparent',
                    transition: 'background-color 150ms ease'
                  }}
                  className="table-row-hover"
                >
                  {/* Test Name & LOINC */}
                  <td style={{ padding: '12px', fontWeight: 500, color: 'var(--color-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{res.test}</span>
                      {res.isEditedByUser && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(53, 214, 232, 0.15)', color: 'var(--color-cyan)', borderRadius: '4px' }}>
                          Edited
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                      LOINC: {res.loinc}
                    </span>
                  </td>

                  {/* Value */}
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="input-text"
                        style={{ width: '80px', padding: '4px 6px', textAlign: 'right' }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="num" style={{ fontWeight: 700, fontSize: '15px' }}>
                        {res.value}
                      </span>
                    )}
                  </td>

                  {/* Unit */}
                  <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>
                    {res.unit}
                  </td>

                  {/* Reference Range */}
                  <td style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="any"
                          value={editRefLow}
                          onChange={(e) => setEditRefLow(e.target.value)}
                          className="input-text"
                          style={{ width: '56px', padding: '3px 4px', fontSize: '12px' }}
                        />
                        <span>-</span>
                        <input
                          type="number"
                          step="any"
                          value={editRefHigh}
                          onChange={(e) => setEditRefHigh(e.target.value)}
                          className="input-text"
                          style={{ width: '56px', padding: '3px 4px', fontSize: '12px' }}
                        />
                      </div>
                    ) : (
                      <span className="num">
                        {res.refLow} – {res.refHigh}
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {renderStatusBadge(res.status)}
                  </td>

                  {/* OCR Confidence */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: res.confidence > 0.95 ? 'var(--color-success)' : 'var(--color-warning)'
                        }}
                      />
                      <span className="num" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {Math.round(res.confidence * 100)}%
                      </span>
                    </div>
                  </td>

                  {/* Edit Actions */}
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 6px' }}
                          onClick={(e) => handleSaveEdit(res.id, e)}
                          title="Save change"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 6px' }}
                          onClick={handleCancelEdit}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={(e) => handleStartEdit(res, e)}
                        title="Edit extracted value"
                      >
                        <Edit3 size={14} />
                        <span style={{ fontSize: '11px', marginLeft: '3px' }}>Edit</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
