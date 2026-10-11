import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  FileText,
  Pill,
  Stethoscope,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Building,
  AlertTriangle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useT } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { useBackend } from '../context/BackendContext';
import { getTimeline } from '../services/api';
import { mockService } from '../services/mock';
import Modal from '../components/common/Modal';
import '../styles/timeline.css';

export default function Timeline() {
  const { t } = useT();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { demoMode } = useBackend();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedCards, setExpandedCards] = useState({});
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false);

  // Follow-up modal state
  const [fuTitle, setFuTitle] = useState('');
  const [fuDate, setFuDate] = useState('');
  const [fuProvider, setFuProvider] = useState('');
  const [fuNotes, setFuNotes] = useState('');
  const [formError, setFormError] = useState('');

  const filterOptions = [
    { id: 'all', label: 'All Events' },
    { id: 'lab_report', label: 'Lab Reports' },
    { id: 'prescription', label: 'Prescriptions' },
    { id: 'discharge_summary', label: 'Discharges' },
    { id: 'diagnostic_report', label: 'Diagnostics' }
  ];

  const fetchTimeline = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      try {
        const mockEvents = await mockService.getTimeline();
        if (signal?.aborted) return;
        setEvents(mockEvents || []);
        setIsDemo(true);
      } catch (err) {
        if (!signal?.aborted) setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
      return;
    }

    try {
      const typeParam = selectedFilter === 'all' ? '' : selectedFilter;
      const data = await getTimeline(typeParam, signal);
      if (signal?.aborted) return;
      setEvents(data || []);
      setIsDemo(false);
    } catch (err) {
      if (signal?.aborted) return;
      if (err.code === 'BACKEND_OFFLINE') {
        try {
          const mockEvents = await mockService.getTimeline();
          setEvents(mockEvents || []);
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
  }, [demoMode, selectedFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTimeline(controller.signal);
    return () => controller.abort();
  }, [fetchTimeline]);

  // Group events by Month Group
  const groupedEvents = useMemo(() => {
    const groups = {};
    events.forEach((ev) => {
      let monthLabel = "Recent";
      if (ev.date) {
        try {
          const d = new Date(ev.date);
          if (!isNaN(d.getTime())) {
            monthLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
          }
        } catch {
          monthLabel = ev.date.slice(0, 7);
        }
      }
      if (!groups[monthLabel]) groups[monthLabel] = [];
      groups[monthLabel].push(ev);
    });
    return groups;
  }, [events]);

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFollowUp = (e) => {
    e.preventDefault();
    if (!fuTitle.trim() || !fuDate) {
      setFormError('Please provide a title and target date.');
      return;
    }

    const newEv = {
      id: `fu-${Date.now()}`,
      date: fuDate,
      type: 'consultation',
      title: `Scheduled Follow-up: ${fuTitle}`,
      source: fuProvider || 'Personal Reminder',
      diagnosis: fuNotes || 'Scheduled clinic check or repeat lab biomarker review.',
      medicines: [],
      flagged: [],
      status: 'scheduled'
    };

    setEvents((prev) => [newEv, ...prev]);

    // Save reminder in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('carepilot_followups') || '[]');
      existing.unshift({
        id: newEv.id,
        title: fuTitle,
        dueDate: fuDate,
        provider: fuProvider,
        notes: fuNotes,
        completed: false
      });
      localStorage.setItem('carepilot_followups', JSON.stringify(existing));
    } catch {}

    setIsAddFollowUpOpen(false);
    setFuTitle('');
    setFuDate('');
    setFuProvider('');
    setFuNotes('');
    setFormError('');

    addToast({
      type: 'success',
      title: 'Follow-up Created',
      message: 'Reminder added to your health timeline.'
    });
  };

  const getCategoryIcon = (category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('prescription')) return <Pill size={16} color="var(--color-violet)" />;
    if (cat.includes('consultation')) return <Stethoscope size={16} color="var(--color-success)" />;
    return <FileText size={16} color="var(--color-cyan)" />;
  };

  return (
    <div className="timeline-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {t('nav.timeline')}
            </h2>
            {isDemo && <span className="badge badge-warning">Demo</span>}
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Longitudinal chronological history of clinical labs, prescriptions, and consult events.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setIsAddFollowUpOpen(true)}
          id="add-follow-up-btn"
        >
          <Plus size={16} />
          <span>Add Follow-up Reminder</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            className={`btn btn-sm ${selectedFilter === opt.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedFilter(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Skeletons, Error or Grouped Events */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface-card" style={{ height: '110px', background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="surface-card" style={{ padding: '48px', textAlign: 'center', borderColor: 'var(--color-critical)' }}>
          <AlertTriangle size={40} color="var(--color-critical)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>Failed to load Timeline</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 20px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchTimeline()}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <div className="surface-card empty-state" style={{ padding: '50px 24px', textAlign: 'center' }}>
          <FolderOpen size={48} color="var(--color-text-subtle)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>No timeline events found</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '6px 0 16px' }}>
            Upload medical records or schedule clinical follow-ups to populate your timeline.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>
            Upload Report
          </button>
        </div>
      ) : (
        Object.entries(groupedEvents).map(([month, monthEvs]) => (
          <div key={month} className="timeline-group">
            <div className="timeline-group-header">
              <Clock size={16} />
              <span>{month}</span>
            </div>

            <div className="timeline-events-list">
              {monthEvs.map((ev) => {
                const isExpanded = Boolean(expandedCards[ev.id]);
                const flaggedTests = ev.flagged || [];

                return (
                  <div
                    key={ev.id}
                    className={`surface-card timeline-card category-${ev.type || 'lab'} hover-lift`}
                    style={{ padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => toggleExpand(ev.id)}
                  >
                    {/* Node Icon on vertical track */}
                    <div className="timeline-node">
                      {getCategoryIcon(ev.type)}
                    </div>

                    <div className="timeline-card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                            {ev.title}
                          </h3>
                          <span className={`badge ${ev.status === 'analyzed' ? 'badge-normal' : 'badge-warning'}`}>
                            {ev.status === 'analyzed' ? 'Verified' : ev.status || 'Processed'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                          <span>{ev.date}</span>
                          <span>•</span>
                          <span>{ev.type?.replace('_', ' ') || 'Record'}</span>
                        </div>
                      </div>

                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px' }}
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Flagged test chips */}
                    {flaggedTests.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {flaggedTests.map((flag, idx) => (
                          <span key={idx} className="badge badge-warning" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            <AlertTriangle size={11} /> Flagged: {flag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '8px 0 0' }}>
                      {ev.diagnosis || ev.summary || (ev.medicines?.length ? `Prescribed: ${ev.medicines.join(', ')}` : "Clinical record event.")}
                    </p>

                    {/* Expanded details with button linking to analysis page */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: '12px', color: 'var(--color-cyan)' }}>
                          Record ID: {ev.id}
                        </span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/analysis/${ev.id}`)}
                        >
                          <span>Open Full Analysis</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Add Follow-up Modal */}
      <Modal
        isOpen={isAddFollowUpOpen}
        onClose={() => setIsAddFollowUpOpen(false)}
        title="Schedule Health Follow-up Reminder"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsAddFollowUpOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateFollowUp}>
              Save Reminder
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {formError && (
            <div style={{ color: 'var(--color-critical)', fontSize: '13px' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Reminder Title *
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Repeat Fasting Blood Sugar & HbA1c"
              value={fuTitle}
              onChange={(e) => setFuTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Target Date *
            </label>
            <input
              type="date"
              className="input-text"
              value={fuDate}
              onChange={(e) => setFuDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Provider / Diagnostic Lab
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Apex Diagnostics / Dr. Sharma"
              value={fuProvider}
              onChange={(e) => setFuProvider(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Clinical Notes
            </label>
            <textarea
              className="input-text"
              rows={3}
              placeholder="Questions to ask or fasting requirements..."
              value={fuNotes}
              onChange={(e) => setFuNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
