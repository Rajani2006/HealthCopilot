import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Pill,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
  Layers,
  FileCheck2,
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
import { useBackend } from '../context/BackendContext';
import StatCard from '../components/common/StatCard';
import { getSummary, getTimeline, listRecords } from '../services/api';
import { mockService } from '../services/mock';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { t } = useT();
  const navigate = useNavigate();
  const { demoMode, online } = useBackend();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [newestRecord, setNewestRecord] = useState(null);
  const [isDataDemo, setIsDataDemo] = useState(false);

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      try {
        const [mockSum, mockTl, mockRecs] = await Promise.all([
          mockService.getHealthSummary(),
          mockService.getTimeline(),
          mockService.getRecords()
        ]);
        if (signal?.aborted) return;
        setSummaryData({
          totals: {
            records: mockRecs.length,
            analyzed: mockRecs.filter((r) => r.type?.includes('Report')).length,
            toReview: mockSum.resultsToDiscuss?.length || 3
          },
          discussWithDoctor: (mockSum.resultsToDiscuss || []).map((r) => ({
            test: r.test,
            value: r.value,
            unit: '',
            status: r.badge?.toLowerCase() || 'high'
          })),
          trends: {
            HbA1c: mockSum.hba1cTrends?.map((d) => ({
              label: d.label,
              date: d.date,
              value: d.value,
              unit: '%',
              refLow: d.refLow || 4.0,
              refHigh: d.refHigh || 5.6
            })),
            Hemoglobin: mockSum.hemoglobinTrends?.map((d) => ({
              label: d.label,
              date: d.date,
              value: d.value,
              unit: 'g/dL',
              refLow: d.refLow || 13.0,
              refHigh: d.refHigh || 17.0
            }))
          }
        });
        setTimelineData(mockTl || []);
        setNewestRecord(mockRecs[0] || null);
        setIsDataDemo(true);
      } catch (err) {
        if (!signal?.aborted) setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
      return;
    }

    // Live backend mode
    try {
      const [sumRes, tlRes, recsRes] = await Promise.all([
        getSummary(signal),
        getTimeline('', signal),
        listRecords({ sort: 'newest' }, signal)
      ]);
      if (signal?.aborted) return;
      setSummaryData(sumRes);
      setTimelineData(tlRes || []);
      const analyzed = (recsRes || []).find((r) => r.status === 'analyzed' || r.status === 'needs_review') || recsRes[0] || null;
      setNewestRecord(analyzed);
      setIsDataDemo(false);
    } catch (err) {
      if (signal?.aborted) return;
      // If backend network fails, gracefully fall back to demo data with demo label
      if (err.code === 'BACKEND_OFFLINE') {
        try {
          const [mockSum, mockTl, mockRecs] = await Promise.all([
            mockService.getHealthSummary(),
            mockService.getTimeline(),
            mockService.getRecords()
          ]);
          setSummaryData({
            totals: {
              records: mockRecs.length,
              analyzed: mockRecs.length,
              toReview: 2
            },
            discussWithDoctor: (mockSum.resultsToDiscuss || []).map((r) => ({
              test: r.test,
              value: r.value,
              unit: '',
              status: r.badge?.toLowerCase() || 'high'
            })),
            trends: {
              HbA1c: mockSum.hba1cTrends?.map((d) => ({
                label: d.label,
                date: d.date,
                value: d.value,
                unit: '%',
                refLow: 4.0,
                refHigh: 5.6
              }))
            }
          });
          setTimelineData(mockTl || []);
          setNewestRecord(mockRecs[0] || null);
          setIsDataDemo(true);
        } catch {
          setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [demoMode, online]);

  const totals = summaryData?.totals || { records: 0, analyzed: 0, toReview: 0 };
  const discussChips = summaryData?.discussWithDoctor || [];
  const trends = summaryData?.trends || {};
  const trendKeys = Object.keys(trends);

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="glass-card" style={{ padding: '32px', minHeight: '160px' }}>
          <div style={{ width: '40%', height: '24px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '16px' }} />
          <div style={{ width: '70%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
        </div>
        <div className="grid-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-3 surface-card" style={{ height: '100px', background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Error state with Retry
  if (error) {
    return (
      <div className="surface-card" style={{ padding: '40px', textAlign: 'center', borderColor: 'var(--color-critical)' }}>
        <AlertTriangle size={40} color="var(--color-critical)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>Failed to load Dashboard data</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 20px', maxWidth: '500px', marginInline: 'auto' }}>
          {error}
        </p>
        <button className="btn btn-primary" onClick={() => loadData()}>
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Empty state when 0 records exist
  if (!isDataDemo && totals.records === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="glass-card dashboard-hero">
          <h2 className="dashboard-hero-title">{t('dashboard.heroTitle')}</h2>
          <p className="dashboard-hero-subtitle">{t('dashboard.heroSubtitle')}</p>
        </div>

        <div className="surface-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <FolderOpen size={56} color="var(--color-cyan)" style={{ margin: '0 auto 20px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
            No health records yet
          </h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Upload your first lab report, prescription, or discharge summary to see AI-powered biomarkers, longitudinal trends, and doctor questions.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/upload')}
            id="empty-dashboard-upload-btn"
          >
            <FileText size={18} />
            <span>Upload your first report</span>
          </button>
        </div>
      </div>
    );
  }

  const latestInsightText =
    newestRecord?.summary?.text ||
    newestRecord?.summary ||
    (isDataDemo
      ? t('dashboard.latestInsightSummary')
      : "Clinical biomarker analysis complete. Review out-of-range indicators with your healthcare provider.");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Glass Hero */}
      <div className="glass-card dashboard-hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h2 className="dashboard-hero-title">{t('dashboard.heroTitle')}</h2>
          {isDataDemo && (
            <span className="badge badge-warning" style={{ fontSize: '11px', alignSelf: 'flex-start' }}>
              Demo
            </span>
          )}
        </div>
        <p className="dashboard-hero-subtitle">{t('dashboard.heroSubtitle')}</p>

        <div className="dashboard-hero-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/upload')}
            id="hero-analyze-report-btn"
          >
            <FileText size={18} />
            <span>{t('dashboard.ctaAnalyze')}</span>
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => navigate('/scanner')}
            id="hero-scan-medicine-btn"
          >
            <Pill size={18} />
            <span>{t('dashboard.ctaScan')}</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Cards Grid */}
      <div className="grid-12">
        <div className="col-3">
          <StatCard
            title={t('dashboard.statRecords')}
            value={totals.records}
            delta={isDataDemo ? "Demo database" : "Stored in database"}
            deltaType="neutral"
            icon={Layers}
          />
        </div>
        <div className="col-3">
          <StatCard
            title={t('dashboard.statAnalyzed')}
            value={totals.analyzed}
            delta={totals.analyzed > 0 ? "OCR Extracted" : "None yet"}
            deltaType="success"
            icon={FileCheck2}
          />
        </div>
        <div className="col-3">
          <StatCard
            title={t('dashboard.statReview')}
            value={totals.toReview}
            delta={totals.toReview > 0 ? "Flagged values" : "All within range"}
            deltaType={totals.toReview > 0 ? "warning" : "success"}
            icon={AlertTriangle}
          />
        </div>
        <div className="col-3">
          <StatCard
            title={t('dashboard.statRecent')}
            value={timelineData[0]?.date ? timelineData[0].date.slice(5) : "—"}
            delta={timelineData[0]?.title ? timelineData[0].title.slice(0, 24) : "No activity"}
            deltaType="neutral"
            icon={Activity}
          />
        </div>
      </div>

      {/* 3. Latest AI Insight Card */}
      <div className="glass-card insight-card">
        <div className="insight-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--color-cyan)" />
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text)' }}>
              {t('dashboard.latestInsightTitle')}
            </h3>
            {isDataDemo && (
              <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                Demo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            <Clock size={14} />
            <span>
              {newestRecord ? `${newestRecord.date || 'Recent'} • ${newestRecord.filename || newestRecord.typeLabel}` : 'Live Insight'}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--color-text)', maxWidth: '900px' }}>
          {latestInsightText}
        </p>

        {/* Discuss With Doctor Chips */}
        {discussChips.length > 0 && (
          <div className="insight-chips">
            {discussChips.map((item, idx) => (
              <span
                key={idx}
                className={`badge ${item.status === 'critical' ? 'badge-critical' : 'badge-warning'}`}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                <AlertTriangle size={13} />
                <strong>{item.test}:</strong> {item.value} {item.unit} ({item.status})
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (newestRecord?.id) {
                navigate(`/analysis/${newestRecord.id}`);
              } else {
                navigate('/analysis');
              }
            }}
            id="view-full-analysis-btn"
          >
            <span>{t('dashboard.viewFullAnalysis')}</span>
            <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (newestRecord?.id) {
                navigate(`/assistant?reportId=${newestRecord.id}`);
              } else {
                navigate('/assistant?topic=metabolic');
              }
            }}
            id="ask-about-this-btn"
          >
            <span>{t('dashboard.askAboutThis')}</span>
          </button>
        </div>
      </div>

      {/* 4. Trend Charts Grid */}
      <div className="grid-12">
        {trendKeys.length > 0 ? (
          trendKeys.slice(0, 2).map((testKey) => {
            const rawPoints = trends[testKey] || [];
            if (!rawPoints.length) return null;
            const trendPoints = rawPoints.map((pt) => ({
              ...pt,
              label: pt.label || pt.date || ''
            }));
            const refLow = trendPoints[0]?.refLow;
            const refHigh = trendPoints[0]?.refHigh;
            const unit = trendPoints[0]?.unit || '';
            const latestVal = trendPoints[trendPoints.length - 1]?.value;
            const firstVal = trendPoints[0]?.value;
            const delta = latestVal !== undefined && firstVal !== undefined ? (latestVal - firstVal).toFixed(1) : 0;

            return (
              <div key={testKey} className="col-6 surface-card chart-card">
                <div className="chart-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                        {testKey} Longitudinal Trend
                      </h3>
                      {isDataDemo && (
                        <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                          Demo
                        </span>
                      )}
                    </div>
                    {refLow !== undefined && refHigh !== undefined && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                        Target: {refLow} – {refHigh} {unit}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: Number(delta) <= 0 ? 'var(--color-success)' : 'var(--color-cyan)',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    {Number(delta) <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                    <span>
                      {latestVal} {unit} (Δ {delta})
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendPoints} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" stroke="#62758F" fontSize={11} tickLine={false} />
                      <YAxis stroke="#62758F" fontSize={11} tickLine={false} />
                      {refLow !== undefined && refHigh !== undefined && (
                        <ReferenceArea y1={refLow} y2={refHigh} fill="#35D6E8" fillOpacity={0.1} />
                      )}
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div
                                style={{
                                  background: '#162640',
                                  border: '1px solid var(--color-cyan)',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px'
                                }}
                              >
                                <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                                  {d.label || d.date}
                                </strong>
                                <div style={{ color: 'var(--color-cyan)', marginTop: '4px' }}>
                                  {testKey}: <strong>{d.value} {unit}</strong>
                                </div>
                                {refLow !== undefined && refHigh !== undefined && (
                                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>
                                    Reference: {refLow} – {refHigh} {unit}
                                  </div>
                                )}
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
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#35D6E8', stroke: '#07111F', strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: '#8B7CFF' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-12 surface-card" style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Upload multiple reports over time to generate longitudinal biomarker trend charts.
            </p>
          </div>
        )}
      </div>

      {/* 5. Recent Activity List */}
      <div className="surface-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              {t('dashboard.recentActivityTitle')}
            </h3>
            {isDataDemo && (
              <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                Demo
              </span>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/timeline')}
            id="view-full-timeline-btn"
          >
            <span>View Timeline</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="activity-list">
          {timelineData.slice(0, 4).map((rec) => (
            <div
              key={rec.id}
              className="activity-item"
              onClick={() => {
                if (rec.id) navigate(`/analysis/${rec.id}`);
                else navigate('/timeline');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="activity-left">
                <div className="activity-icon">
                  {rec.type === 'prescription' ? (
                    <Pill size={18} color="var(--color-violet)" />
                  ) : (
                    <FileText size={18} color="var(--color-cyan)" />
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                    {rec.title}
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                    {rec.source || rec.type} • {rec.date}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${rec.status === 'Review Required' || rec.status === 'needs_review' ? 'badge-warning' : 'badge-normal'}`}>
                  {rec.status}
                </span>
                <ArrowRight size={14} color="var(--color-text-subtle)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
