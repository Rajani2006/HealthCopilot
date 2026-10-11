import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Stethoscope,
  Info,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea
} from 'recharts';
import { useT } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { useBackend } from '../context/BackendContext';
import { getSummary } from '../services/api';
import { mockService } from '../services/mock';
import Modal from '../components/common/Modal';
import '../styles/summary.css';

export default function HealthSummary() {
  const { t } = useT();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { demoMode } = useBackend();

  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState(null);

  // Client-side reminders (localStorage)
  const [reminders, setReminders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('carepilot_followups') || '[]');
    } catch {
      return [];
    }
  });

  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remDate, setRemDate] = useState('');
  const [remProvider, setRemProvider] = useState('');
  const [remNotes, setRemNotes] = useState('');
  const [formErr, setFormErr] = useState('');

  // Persist reminders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('carepilot_followups', JSON.stringify(reminders));
    } catch {}
  }, [reminders]);

  const fetchSummary = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      try {
        const mockSum = await mockService.getHealthSummary();
        if (signal?.aborted) return;
        setSummaryData({
          totals: { records: 6, analyzed: 5, toReview: 3 },
          discussWithDoctor: (mockSum.resultsToDiscuss || []).map((r) => ({
            test: r.test,
            value: r.value,
            unit: '',
            status: r.badge?.toLowerCase() || 'high',
            date: '2026-10-04'
          })),
          changes: [
            {
              test: 'HbA1c',
              previous: { value: 6.5, date: '2026-03-08' },
              latest: { value: 6.2, date: '2026-10-04' },
              delta: -0.3,
              direction: 'down'
            },
            {
              test: 'Fasting Glucose',
              previous: { value: 118, date: '2026-06-20' },
              latest: { value: 114, date: '2026-10-04' },
              delta: -4,
              direction: 'down'
            },
            {
              test: 'Hemoglobin',
              previous: { value: 13.8, date: '2026-03-08' },
              latest: { value: 14.2, date: '2026-10-04' },
              delta: 0.4,
              direction: 'up'
            }
          ],
          needsVerification: [],
          doctorQuestions: mockSum.questionsForDoctor || [],
          trends: {
            HbA1c: mockSum.hba1cTrends?.map((d) => ({
              label: d.label,
              date: d.date,
              value: d.value,
              unit: '%',
              refLow: 4.0,
              refHigh: 5.6
            })),
            Hemoglobin: mockSum.hemoglobinTrends?.map((d) => ({
              label: d.label,
              date: d.date,
              value: d.value,
              unit: 'g/dL',
              refLow: 13.0,
              refHigh: 17.0
            }))
          },
          disclaimer: 'Informational only. Not a diagnosis or a substitute for professional medical advice.'
        });
        setIsDemo(true);
      } catch (err) {
        if (!signal?.aborted) setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
      return;
    }

    try {
      const data = await getSummary(signal);
      if (signal?.aborted) return;
      setSummaryData(data);
      setIsDemo(false);
    } catch (err) {
      if (signal?.aborted) return;
      if (err.code === 'BACKEND_OFFLINE') {
        try {
          const mockSum = await mockService.getHealthSummary();
          setSummaryData({
            totals: { records: 6, analyzed: 5, toReview: 3 },
            discussWithDoctor: (mockSum.resultsToDiscuss || []).map((r) => ({
              test: r.test,
              value: r.value,
              unit: '',
              status: r.badge?.toLowerCase() || 'high',
              date: '2026-10-04'
            })),
            changes: [
              {
                test: 'HbA1c',
                previous: { value: 6.5, date: '2026-03-08' },
                latest: { value: 6.2, date: '2026-10-04' },
                delta: -0.3,
                direction: 'down'
              },
              {
                test: 'Fasting Glucose',
                previous: { value: 118, date: '2026-06-20' },
                latest: { value: 114, date: '2026-10-04' },
                delta: -4,
                direction: 'down'
              },
              {
                test: 'Hemoglobin',
                previous: { value: 13.8, date: '2026-03-08' },
                latest: { value: 14.2, date: '2026-10-04' },
                delta: 0.4,
                direction: 'up'
              }
            ],
            needsVerification: [],
            doctorQuestions: mockSum.questionsForDoctor || [],
            trends: {
              HbA1c: mockSum.hba1cTrends?.map((d) => ({
                label: d.label,
                date: d.date,
                value: d.value,
                unit: '%',
                refLow: 4.0,
                refHigh: 5.6
              })),
              Hemoglobin: mockSum.hemoglobinTrends?.map((d) => ({
                label: d.label,
                date: d.date,
                value: d.value,
                unit: 'g/dL',
                refLow: 13.0,
                refHigh: 17.0
              }))
            },
            disclaimer: 'Informational only. Not a diagnosis or a substitute for professional medical advice.'
          });
          setIsDemo(true);
        } catch {
          setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSummary(controller.signal);
    return () => controller.abort();
  }, [fetchSummary]);

  const handleCopyQuestion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionIndex(idx);
    addToast({
      type: 'info',
      title: 'Question Copied',
      message: 'Added to clipboard for your consultation notes.'
    });
    setTimeout(() => setCopiedQuestionIndex(null), 2500);
  };

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!remTitle.trim() || !remDate) {
      setFormErr('Please provide a title and due date.');
      return;
    }

    const newRem = {
      id: `fu-${Date.now()}`,
      title: remTitle,
      dueDate: remDate,
      provider: remProvider || 'Primary Care Clinic',
      notes: remNotes,
      completed: false
    };

    setReminders((prev) => [newRem, ...prev]);

    setIsAddReminderOpen(false);
    setRemTitle('');
    setRemDate('');
    setRemProvider('');
    setRemNotes('');
    setFormErr('');

    addToast({
      type: 'success',
      title: 'Reminder Created',
      message: 'Clinical reminder saved to your session.'
    });
  };

  const handleDeleteReminder = (id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    addToast({
      type: 'info',
      title: 'Reminder Removed',
      message: 'Follow-up reminder deleted.'
    });
  };

  const handleToggleReminder = (id) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  if (loading) {
    return (
      <div className="summary-container">
        <div className="surface-card" style={{ height: '120px', background: 'rgba(255,255,255,0.03)' }} />
        <div className="grid-12">
          <div className="col-6 surface-card" style={{ height: '260px', background: 'rgba(255,255,255,0.02)' }} />
          <div className="col-6 surface-card" style={{ height: '260px', background: 'rgba(255,255,255,0.02)' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card" style={{ padding: '48px', textAlign: 'center', borderColor: 'var(--color-critical)' }}>
        <AlertTriangle size={40} color="var(--color-critical)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>Failed to load Health Summary</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 20px' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => fetchSummary()}>
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const resultsToDiscuss = summaryData?.discussWithDoctor || [];
  const changes = summaryData?.changes || [];
  const needsVerification = summaryData?.needsVerification || [];
  const doctorQuestions = summaryData?.doctorQuestions || [];
  const trends = summaryData?.trends || {};
  const trendKeys = Object.keys(trends);

  return (
    <div className="summary-container">
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {t('nav.summary')}
          </h2>
          {isDemo && <span className="badge badge-warning">Demo</span>}
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Longitudinal synthesis of lab changes, doctor discussion points, and self-managed reminders.
        </p>
      </div>

      {/* 1. Results to Discuss & Needs Verification */}
      <div className="grid-12">
        <div className="col-6 surface-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--color-warning)" />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                Results to Discuss With Doctor ({resultsToDiscuss.length})
              </h3>
            </div>
          </div>

          {resultsToDiscuss.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No out-of-range values currently flagged for doctor review.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {resultsToDiscuss.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{item.test}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', display: 'block' }}>
                      {item.date ? `Recorded ${item.date}` : 'Latest panel'}
                      {item.refLow != null && item.refHigh != null && ` • Ref: ${item.refLow}–${item.refHigh} ${item.unit || ''}`}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-warning)', display: 'block' }}>
                      {item.value} {item.unit}
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '10px', textTransform: 'capitalize' }}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Longitudinal Changes (arrows from direction) */}
        <div className="col-6 surface-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--color-cyan)" />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                Biomarker Directional Changes
              </h3>
            </div>
          </div>

          {changes.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
              Upload at least two reports over time to observe direction and delta comparisons.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {changes.map((ch, idx) => {
                const isDown = ch.direction === 'down';
                const isUp = ch.direction === 'up';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{ch.test}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', display: 'block' }}>
                        {ch.previous?.value} → {ch.latest?.value}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isDown ? (
                        <TrendingDown size={18} color="var(--color-success)" />
                      ) : isUp ? (
                        <TrendingUp size={18} color="var(--color-cyan)" />
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isDown ? 'var(--color-success)' : 'var(--color-cyan)'
                        }}
                      >
                        {ch.delta > 0 ? `+${ch.delta}` : ch.delta} ({ch.direction})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Needs verification banner if any values require clinician verification */}
      {needsVerification.length > 0 && (
        <div
          className="surface-card"
          style={{
            padding: '16px 20px',
            borderColor: 'var(--color-warning)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <HelpCircle size={18} color="var(--color-warning)" />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              Biomarkers Needing Verification ({needsVerification.length})
            </h4>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {needsVerification.map((nv, idx) => (
              <span key={idx} className="badge badge-verification" style={{ fontSize: '12px' }}>
                {nv.test}: {nv.value} {nv.unit} (Verify against original report)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. Questions for Doctor (with Copy button) */}
      <div className="surface-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Stethoscope size={18} color="var(--color-cyan)" />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            Questions to Ask Your Doctor
          </h3>
        </div>

        {doctorQuestions.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            No questions formulated yet. Upload a lab report to generate consultation prompts.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {doctorQuestions.map((q, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                  "{q}"
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopyQuestion(q, idx)}
                  title="Copy question to clipboard"
                  style={{ flexShrink: 0 }}
                  aria-label="Copy question"
                >
                  {copiedQuestionIndex === idx ? (
                    <Check size={16} color="var(--color-success)" />
                  ) : (
                    <Copy size={16} />
                  )}
                  <span style={{ marginLeft: '4px', fontSize: '12px' }}>
                    {copiedQuestionIndex === idx ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Trend Charts */}
      {trendKeys.length > 0 && (
        <div className="grid-12">
          {trendKeys.map((testName) => {
            const rawPts = trends[testName] || [];
            if (!rawPts.length) return null;
            const dataPts = rawPts.map((pt) => ({
              ...pt,
              label: pt.label || pt.date || ''
            }));
            const refLow = dataPts[0]?.refLow;
            const refHigh = dataPts[0]?.refHigh;
            const unit = dataPts[0]?.unit || '';

            return (
              <div key={testName} className="col-6 surface-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 12px' }}>
                  {testName} Trend
                </h4>
                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataPts} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" stroke="#62758F" fontSize={11} tickLine={false} />
                      <YAxis stroke="#62758F" fontSize={11} tickLine={false} />
                      {refLow != null && refHigh != null && (
                        <ReferenceArea y1={refLow} y2={refHigh} fill="#35D6E8" fillOpacity={0.1} />
                      )}
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div style={{ background: '#162640', border: '1px solid var(--color-cyan)', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>{d.label || d.date}</strong>
                                <div style={{ color: 'var(--color-cyan)' }}>
                                  {d.value} {unit}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#35D6E8"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#35D6E8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Client-side Follow-up Reminders (localStorage) */}
      <div className="surface-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              Self-Managed Clinical Follow-ups
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Client-side reminders with validation. No automated predictions or risk scoring.
            </span>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsAddReminderOpen(true)}
            id="add-summary-reminder-btn"
          >
            <Plus size={14} />
            <span>Add Reminder</span>
          </button>
        </div>

        {reminders.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            No clinical follow-ups scheduled. Click "Add Reminder" to keep track of repeat blood work or doctor visits.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reminders.map((rem) => (
              <div
                key={rem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(rem.completed)}
                    onChange={() => handleToggleReminder(rem.id)}
                    style={{ accentColor: 'var(--color-cyan)', cursor: 'pointer' }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: '14px',
                        color: rem.completed ? 'var(--color-text-subtle)' : 'var(--color-text)',
                        textDecoration: rem.completed ? 'line-through' : 'none'
                      }}
                    >
                      {rem.title}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>
                      Due: {rem.dueDate} {rem.provider && `• ${rem.provider}`}
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-critical)', padding: '4px' }}
                  onClick={() => handleDeleteReminder(rem.id)}
                  aria-label="Delete reminder"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Disclaimer */}
      <footer className="clinical-disclaimer-footer" role="contentinfo">
        <HelpCircle size={15} color="var(--color-cyan)" />
        <span>{summaryData?.disclaimer || t('disclaimerSticky')}</span>
      </footer>

      {/* Add Reminder Modal */}
      <Modal
        isOpen={isAddReminderOpen}
        onClose={() => setIsAddReminderOpen(false)}
        title="Create Follow-up Reminder"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsAddReminderOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddReminder}>
              Save Reminder
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddReminder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {formErr && <div style={{ color: 'var(--color-critical)', fontSize: '13px' }}>{formErr}</div>}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Reminder Title *
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Check Vitamin D Levels Post-Supplementation"
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Due Date *
            </label>
            <input
              type="date"
              className="input-text"
              value={remDate}
              onChange={(e) => setRemDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Provider / Clinic
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Apex Diagnostics"
              value={remProvider}
              onChange={(e) => setRemProvider(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Notes
            </label>
            <textarea
              className="input-text"
              rows={2}
              placeholder="Fasting or specific test guidelines..."
              value={remNotes}
              onChange={(e) => setRemNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
