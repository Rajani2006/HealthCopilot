import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Pill,
  Trash2,
  ArrowRight,
  Plus,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  RefreshCw,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useT } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { useBackend } from '../context/BackendContext';
import { listRecords, deleteRecord as apiDeleteRecord, analyzeReport } from '../services/api';
import { mockService } from '../services/mock';
import Modal from '../components/common/Modal';
import '../styles/records.css';

const TYPE_FILTER_MAP = {
  'All': '',
  'Lab Report': 'lab_report',
  'Prescription': 'prescription',
  'Discharge Summary': 'discharge_summary',
  'Diagnostic Report': 'diagnostic_report'
};

export default function HealthRecords() {
  const { t } = useT();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { demoMode } = useBackend();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTypeLabel, setSelectedTypeLabel] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyzingRecordId, setAnalyzingRecordId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load records
  const fetchRecords = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      try {
        const mockList = await mockService.getRecords();
        if (signal?.aborted) return;
        let filtered = mockList;
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.title?.toLowerCase().includes(q) ||
              r.source?.toLowerCase().includes(q) ||
              (r.highlights && r.highlights.some((h) => h.toLowerCase().includes(q)))
          );
        }
        if (selectedTypeLabel !== 'All') {
          filtered = filtered.filter((r) => r.type === selectedTypeLabel);
        }
        filtered.sort((a, b) => {
          if (sortOrder === 'oldest') return new Date(a.date) - new Date(b.date);
          return new Date(b.date) - new Date(a.date);
        });
        setRecords(filtered);
        setIsDemo(true);
      } catch (err) {
        if (!signal?.aborted) setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
      return;
    }

    try {
      const typeParam = TYPE_FILTER_MAP[selectedTypeLabel] || '';
      const data = await listRecords(
        { search: debouncedSearch, type: typeParam, sort: sortOrder },
        signal
      );
      if (signal?.aborted) return;
      setRecords(data || []);
      setIsDemo(false);
    } catch (err) {
      if (signal?.aborted) return;
      if (err.code === 'BACKEND_OFFLINE') {
        try {
          const mockList = await mockService.getRecords();
          setRecords(mockList || []);
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
  }, [demoMode, debouncedSearch, selectedTypeLabel, sortOrder]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecords(controller.signal);
    return () => controller.abort();
  }, [fetchRecords]);

  // Delete Record
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);

    if (isDemo || demoMode) {
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      setRecordToDelete(null);
      setIsDeleting(false);
      addToast({
        type: 'warning',
        title: 'Record Removed',
        message: `${recordToDelete.filename || recordToDelete.title} removed from session.`
      });
      return;
    }

    try {
      await apiDeleteRecord(recordToDelete.id);
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      addToast({
        type: 'success',
        title: 'Record Deleted',
        message: `${recordToDelete.filename || recordToDelete.typeLabel || 'Document'} deleted from database.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message
      });
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };

  // Analyze Record if status is 'uploaded'
  const handleAnalyzeRecord = async (rec) => {
    if (rec.status !== 'uploaded') {
      navigate(`/analysis/${rec.id}`);
      return;
    }

    try {
      setAnalyzingRecordId(rec.id);
      addToast({
        type: 'info',
        title: 'Running OCR & Analysis',
        message: 'Extracting biomarker values from document...'
      });
      await analyzeReport(rec.id);
      addToast({
        type: 'success',
        title: 'Analysis Complete',
        message: 'Biomarkers extracted successfully.'
      });
      navigate(`/analysis/${rec.id}`);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Analysis Failed',
        message: err.message
      });
    } finally {
      setAnalyzingRecordId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {t('nav.records')}
            </h2>
            {isDemo && <span className="badge badge-warning">Demo</span>}
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Search, filter, and review all clinical documents, lab panels, and doctor prescriptions.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          id="records-add-btn"
        >
          <Plus size={16} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Toolbar: Search, Filters, Sort */}
      <div className="surface-card records-toolbar">
        <div className="records-search-bar">
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              color="var(--color-text-subtle)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by test, medication, or document name..."
              className="input-text"
              style={{ paddingLeft: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search records"
            />
          </div>
        </div>

        <div className="records-filters">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(TYPE_FILTER_MAP).map((typeLabel) => (
              <button
                key={typeLabel}
                className={`btn btn-sm ${selectedTypeLabel === typeLabel ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedTypeLabel(typeLabel)}
              >
                {typeLabel}
              </button>
            ))}
          </div>

          <select
            className="input-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
            aria-label="Sort records"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="records-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-card" style={{ height: '220px', background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="surface-card" style={{ padding: '48px', textAlign: 'center', borderColor: 'var(--color-critical)' }}>
          <AlertTriangle size={40} color="var(--color-critical)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>Failed to load Health Records</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 20px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchRecords()}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="surface-card empty-state">
          <FolderOpen size={48} color="var(--color-text-subtle)" />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
              No health records found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {debouncedSearch || selectedTypeLabel !== 'All'
                ? "Try clearing filters to see all stored documents."
                : "Upload your first medical report to begin tracking."}
            </p>
          </div>
          {debouncedSearch || selectedTypeLabel !== 'All' ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedTypeLabel('All');
              }}
            >
              Clear Filters
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="records-grid">
          {records.map((rec) => {
            const isPrescription = rec.type === 'prescription';
            const statusBadge =
              rec.status === 'analyzed'
                ? 'badge-normal'
                : rec.status === 'uploaded'
                ? 'badge-warning'
                : 'badge-warning';

            return (
              <div key={rec.id} className="surface-card record-card hover-lift">
                <div>
                  <div className="record-card-header">
                    <span className="record-type-pill">
                      {isPrescription ? <Pill size={13} /> : <FileText size={13} />}
                      {rec.typeLabel || rec.type}
                    </span>
                    <span className={`badge ${statusBadge}`}>
                      {rec.status === 'analyzed' ? 'Verified' : rec.status === 'uploaded' ? 'Needs Analysis' : rec.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginTop: '10px' }}>
                    {rec.filename || rec.title || 'Medical Document'}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={13} />
                      <span>{rec.labName || rec.source || 'Clinical Stored Document'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      <span>{rec.date || rec.created_at?.slice(0, 10) || 'Recent'}</span>
                    </div>
                  </div>

                  {/* Highlights / Biomarkers Preview */}
                  {rec.results && rec.results.length > 0 && (
                    <div className="record-highlights" style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        Extracted Biomarkers ({rec.results.length}):
                      </span>
                      {rec.results.slice(0, 3).map((r, i) => (
                        <div key={i} style={{ color: 'var(--color-text)', fontSize: '12px' }}>
                          • {r.test}: <strong>{r.value} {r.unit}</strong> ({r.status})
                        </div>
                      ))}
                    </div>
                  )}

                  {rec.highlights && rec.highlights.length > 0 && !rec.results?.length && (
                    <div className="record-highlights" style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        Highlights:
                      </span>
                      {rec.highlights.slice(0, 3).map((h, i) => (
                        <div key={i} style={{ color: 'var(--color-text)', fontSize: '12px' }}>
                          • {h}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="record-card-footer">
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-critical)', padding: '4px 8px' }}
                    onClick={() => setRecordToDelete(rec)}
                    aria-label={`Delete record ${rec.filename || rec.title}`}
                    title="Delete record"
                  >
                    <Trash2 size={15} />
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/analysis/${rec.id}`)}
                    >
                      View
                    </button>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAnalyzeRecord(rec)}
                      disabled={analyzingRecordId === rec.id}
                    >
                      {analyzingRecordId === rec.id ? (
                        <>
                          <Loader2 size={13} className="spin-animation" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <span>{rec.status === 'uploaded' ? 'Run Analysis' : 'Analysis'}</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        title="Delete Health Record"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setRecordToDelete(null)} disabled={isDeleting}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        }
      >
        <div>
          <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0 }}>
            Are you sure you want to permanently delete{' '}
            <strong>{recordToDelete?.filename || recordToDelete?.title || 'this record'}</strong>?
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '8px' }}>
            This will remove the file and all associated extracted biomarkers from the database.
          </p>
        </div>
      </Modal>
    </div>
  );
}
