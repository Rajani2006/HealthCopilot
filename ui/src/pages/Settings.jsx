import React, { useState } from 'react';
import {
  User,
  Globe,
  Sliders,
  Bell,
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Link,
  Edit2,
  Check
} from 'lucide-react';
import { useT } from '../i18n/I18nContext';
import { useHealthData } from '../context/HealthDataContext';
import { useToast } from '../context/ToastContext';
import { useBackend } from '../context/BackendContext';
import { linkAbha, exportFhir, exportRecords, deleteAllRecords } from '../services/api';
import { generateFhirBundle } from '../services/mock';
import Modal from '../components/common/Modal';
import '../styles/settings.css';

export default function Settings() {
  const { t, lang, setLang, availableLanguages } = useT();
  const {
    patientProfile,
    setPatientProfile,
    records,
    activeReport,
    accessibility,
    setAccessibility,
    resetToDefaults
  } = useHealthData();
  const { addToast } = useToast();
  const { demoMode } = useBackend();

  // ABHA linking state
  const [abhaInput, setAbhaInput] = useState(patientProfile.abhaNumber || '');
  const [abhaLinked, setAbhaLinked] = useState(patientProfile.abhaLinked ?? true);
  const [abhaError, setAbhaError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications
  const [notifTimeline, setNotifTimeline] = useState(true);
  const [notifReports, setNotifReports] = useState(true);
  const [notifMeds, setNotifMeds] = useState(false);

  // Profile Edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profName, setProfName] = useState(patientProfile.fullName);
  const [profAge, setProfAge] = useState(patientProfile.age);
  const [profBlood, setProfBlood] = useState(patientProfile.bloodGroup);

  // Delete typed confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Handle ABHA Link
  const handleLinkAbha = async (e) => {
    e.preventDefault();
    const cleanDigits = abhaInput.replace(/\D/g, '');
    if (cleanDigits.length !== 14) {
      setAbhaError('ABHA number must be exactly 14 digits (e.g. 91-4820-9182-3714).');
      return;
    }

    const formatted = `${cleanDigits.slice(0, 2)}-${cleanDigits.slice(2, 6)}-${cleanDigits.slice(6, 10)}-${cleanDigits.slice(10, 14)}`;
    setAbhaError('');

    if (!demoMode) {
      try {
        setIsSubmitting(true);
        const res = await linkAbha(formatted);
        setAbhaInput(res.abha || formatted);
        setAbhaLinked(true);
        setPatientProfile((prev) => ({
          ...prev,
          abhaNumber: res.abha || formatted,
          abhaAddress: `${prev.fullName.toLowerCase().replace(/[^a-z]/g, '')}@abdm`,
          abhaLinked: true
        }));
        addToast({
          type: 'success',
          title: 'ABHA Linked',
          message: res.note || 'Mock link (demo only, not connected to ABDM)'
        });
      } catch (err) {
        setAbhaError(err.message || 'Failed to link ABHA on backend');
        addToast({
          type: 'error',
          title: 'ABHA Linking Failed',
          message: err.message || 'Could not link ABHA'
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setAbhaInput(formatted);
      setAbhaLinked(true);
      setPatientProfile((prev) => ({
        ...prev,
        abhaNumber: formatted,
        abhaAddress: `${prev.fullName.toLowerCase().replace(/[^a-z]/g, '')}@abdm`,
        abhaLinked: true
      }));
      addToast({
        type: 'success',
        title: 'ABHA Linked (Demo)',
        message: 'Mock link (demo only, not connected to ABDM)'
      });
    }
  };

  const handleUnlinkAbha = () => {
    setAbhaLinked(false);
    setPatientProfile((prev) => ({ ...prev, abhaLinked: false }));
    addToast({
      type: 'info',
      title: 'ABHA Unlinked',
      message: 'Mock ABHA linkage removed.'
    });
  };

  // Profile Save
  const handleSaveProfile = () => {
    setPatientProfile((prev) => ({
      ...prev,
      fullName: profName,
      initials: profName.split(' ').map((n) => n[0]).join('.').toUpperCase(),
      age: Number(profAge),
      bloodGroup: profBlood
    }));
    setIsEditingProfile(false);
    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Patient profile settings saved.'
    });
  };

  // FHIR Export Button
  const handleExportFhirBundle = async () => {
    try {
      let bundle;
      if (!demoMode) {
        bundle = await exportFhir();
      } else {
        bundle = generateFhirBundle(patientProfile, activeReport);
      }

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `carepilot-fhir-bundle-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'FHIR Bundle Exported',
        message: 'Downloaded standard FHIR R4 JSON bundle with LOINC codes.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'FHIR Export Failed',
        message: err.message || 'Failed to export FHIR bundle'
      });
    }
  };

  // Download All Records JSON
  const handleDownloadAllData = async () => {
    try {
      let exportData;
      if (!demoMode) {
        exportData = await exportRecords();
      } else {
        exportData = {
          patient: patientProfile,
          recordsCount: records.length,
          records,
          activeReport,
          exportedAt: new Date().toISOString()
        };
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `carepilot-patient-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Records Downloaded',
        message: 'Complete patient record JSON file generated.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Failed to export records'
      });
    }
  };

  // Delete All Data (Typed Confirm)
  const handleConfirmDeleteAll = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    try {
      if (!demoMode) {
        await deleteAllRecords();
      }
      resetToDefaults();
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
      addToast({
        type: 'warning',
        title: 'Records Deleted',
        message: !demoMode
          ? 'All records deleted from the server and local state reset.'
          : 'All local session records cleared and reset to initial demo defaults.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete records on server'
      });
    }
  };

  return (
    <div className="settings-container">
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
          {t('nav.settings')}
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Manage your patient identity, ABHA link, language, accessibility preferences, and health data exports.
        </p>
      </div>

      {/* 1. Patient Profile Section */}
      <div className="surface-card settings-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--color-cyan)" />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)' }}>
              Patient Profile
            </h3>
          </div>
          {isEditingProfile ? (
            <button className="btn btn-primary btn-sm" onClick={handleSaveProfile}>
              <Check size={14} />
              <span>Save</span>
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingProfile(true)}>
              <Edit2 size={14} />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="input-text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                type="number"
                className="input-text"
                value={profAge}
                onChange={(e) => setProfAge(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <input
                type="text"
                className="input-text"
                value={profBlood}
                onChange={(e) => setProfBlood(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>PATIENT INITIALS</span>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block', marginTop: '2px' }}>
                {patientProfile.initials} ({patientProfile.fullName})
              </strong>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>AGE & GENDER</span>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block', marginTop: '2px' }}>
                {patientProfile.age} Years • {patientProfile.gender}
              </strong>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-raised)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>BLOOD GROUP</span>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block', marginTop: '2px' }}>
                {patientProfile.bloodGroup}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* 2. Mock ABHA Card */}
      <div className="surface-card settings-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link size={18} color="var(--color-cyan)" />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)' }}>
              Ayushman Bharat Health Account (ABHA)
            </h3>
          </div>
          <span className="badge badge-warning">
            Mock link (demo only, not connected to ABDM)
          </span>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Enter a 14-digit ABHA number to simulate government health locker linkage.
        </p>

        {abhaLinked ? (
          <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="var(--color-success)" />
                <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                  Linked ABHA: {patientProfile.abhaNumber}
                </strong>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-cyan)', marginTop: '2px', display: 'block' }}>
                ABHA Address: {patientProfile.abhaAddress}
              </span>
            </div>

            <button className="btn btn-outline btn-sm" onClick={handleUnlinkAbha}>
              Unlink ABHA
            </button>
          </div>
        ) : (
          <form onSubmit={handleLinkAbha} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                className="input-text"
                placeholder="e.g. 91-4820-9182-3714"
                value={abhaInput}
                onChange={(e) => setAbhaInput(e.target.value)}
              />
              {abhaError && (
                <span style={{ fontSize: '12px', color: 'var(--color-critical)', marginTop: '4px', display: 'block' }}>
                  {abhaError}
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Linking...' : 'Link ABHA Number'}
            </button>
          </form>
        )}
      </div>

      {/* 3. Accessibility Controls (Working live) */}
      <div className="surface-card settings-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="var(--color-cyan)" />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)' }}>
            Accessibility & Display
          </h3>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Font Size Scale</span>
            <span className="settings-row-desc">Adjust UI typography sizing across all cards and tables.</span>
          </div>
          <select
            className="input-select"
            value={accessibility.fontSize}
            onChange={(e) => setAccessibility((prev) => ({ ...prev, fontSize: e.target.value }))}
            style={{ width: 'auto', padding: '6px 12px' }}
            aria-label="Font size scale"
          >
            <option value="normal">Normal (16px base)</option>
            <option value="lg">Large (18px base)</option>
            <option value="xl">Extra Large (20px base)</option>
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">High Contrast Mode</span>
            <span className="settings-row-desc">Enforces deep black backgrounds with enhanced contrast borders for low vision.</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={accessibility.highContrast}
              onChange={(e) => setAccessibility((prev) => ({ ...prev, highContrast: e.target.checked }))}
              aria-label="Toggle high contrast"
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Reduced Motion</span>
            <span className="settings-row-desc">Disables transitions, hover transforms, and pulsing keyframes.</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={accessibility.reducedMotion}
              onChange={(e) => setAccessibility((prev) => ({ ...prev, reducedMotion: e.target.checked }))}
              aria-label="Toggle reduced motion"
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* 4. Language Selector */}
      <div className="surface-card settings-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} color="var(--color-cyan)" />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)' }}>
            Language & Regional Localization
          </h3>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Interface Language</span>
            <span className="settings-row-desc">
              {t('translationNotice')}
            </span>
          </div>
          <select
            className="input-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px' }}
            aria-label="Select interface language"
          >
            {availableLanguages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native} ({l.label})
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          {t('ocrLimitationNotice')}
        </div>
      </div>

      {/* 5. Notifications Toggles */}
      <div className="surface-card settings-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="var(--color-cyan)" />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)' }}>
            Notification Preferences
          </h3>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Timeline Reminders</span>
            <span className="settings-row-desc">Alerts when repeat blood sugar or HbA1c tests approach their due date.</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notifTimeline}
              onChange={(e) => setNotifTimeline(e.target.checked)}
              aria-label="Toggle timeline reminders"
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Report Analysis Alerts</span>
            <span className="settings-row-desc">Notify when background OCR finishes extracting lab values.</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notifReports}
              onChange={(e) => setNotifReports(e.target.checked)}
              aria-label="Toggle report alerts"
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Medication Refill Reminders</span>
            <span className="settings-row-desc">Alerts when a 90-day statin or metformin course nears expiration.</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notifMeds}
              onChange={(e) => setNotifMeds(e.target.checked)}
              aria-label="Toggle medication reminders"
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* 6. FHIR Export & Privacy Data Actions */}
      <div className="surface-card settings-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="var(--color-cyan)" />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text)' }}>
            Privacy, Consent & Data Portability
          </h3>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Export as Standard FHIR R4 Bundle</span>
            <span className="settings-row-desc">
              Produces interoperable HL7 FHIR JSON with LOINC codes for Patient, Observation, and Medication resources.
            </span>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleExportFhirBundle}
            id="export-fhir-bundle-btn"
          >
            <FileCode size={15} />
            <span>Export FHIR</span>
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Download My Health Records</span>
            <span className="settings-row-desc">Download complete profile, lab records, and timeline as a backup JSON.</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadAllData}
            id="download-my-records-btn"
          >
            <Download size={15} />
            <span>Download JSON</span>
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title" style={{ color: 'var(--color-critical)' }}>
              Delete My Health Records
            </span>
            <span className="settings-row-desc">
              Irrevocably erase all uploaded reports, extracted biomarkers, and user notes from local memory.
            </span>
          </div>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setIsDeleteModalOpen(true)}
            id="delete-my-records-btn"
          >
            <Trash2 size={15} />
            <span>Delete Records</span>
          </button>
        </div>
      </div>

      {/* Typed Confirmation Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Data Eradication"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              onClick={handleConfirmDeleteAll}
              id="confirm-delete-all-btn"
            >
              Permanently Erase
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)', borderRadius: '6px', color: 'var(--color-critical)', fontSize: '13px' }}>
            This action will clear all 6 demo records, custom timeline entries, and resets the database back to clean demo state.
          </div>

          <p style={{ fontSize: '13px', color: 'var(--color-text)' }}>
            To confirm this destructive action, please type <strong>DELETE</strong> below:
          </p>

          <input
            type="text"
            className="input-text"
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}
