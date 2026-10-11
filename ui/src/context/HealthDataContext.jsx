import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  initialPatientProfile,
  initialRecords,
  defaultAnalysisReport,
  defaultPrescription,
  initialTimelineEvents,
  initialFollowUps
} from '../data/mockData';
import { api } from '../services/api';

const HealthDataContext = createContext(null);

export function HealthDataProvider({ children }) {
  // 1. Patient Profile
  const [patientProfile, setPatientProfile] = useState(() => {
    const saved = localStorage.getItem('carepilot_patient');
    return saved ? JSON.parse(saved) : initialPatientProfile;
  });

  // 2. Health Records
  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('carepilot_records');
    return saved ? JSON.parse(saved) : initialRecords;
  });

  // 3. Active Report Analysis
  const [activeReport, setActiveReport] = useState(() => {
    const saved = localStorage.getItem('carepilot_active_report');
    return saved ? JSON.parse(saved) : defaultAnalysisReport;
  });

  // 4. Timeline Events
  const [timelineEvents, setTimelineEvents] = useState(() => {
    const saved = localStorage.getItem('carepilot_timeline');
    return saved ? JSON.parse(saved) : initialTimelineEvents;
  });

  // 5. Follow-up Reminders
  const [followUps, setFollowUps] = useState(() => {
    const saved = localStorage.getItem('carepilot_followups');
    return saved ? JSON.parse(saved) : initialFollowUps;
  });

  // 6. Accessibility Settings
  const [accessibility, setAccessibility] = useState(() => {
    const saved = localStorage.getItem('carepilot_accessibility');
    return saved ? JSON.parse(saved) : {
      fontSize: 'normal', // 'normal' | 'lg' | 'xl'
      highContrast: false,
      reducedMotion: false
    };
  });

  // 7. Sync accessibility settings to document body
  useEffect(() => {
    document.body.classList.remove('font-lg', 'font-xl', 'high-contrast', 'reduced-motion');
    if (accessibility.fontSize === 'lg') document.body.classList.add('font-lg');
    if (accessibility.fontSize === 'xl') document.body.classList.add('font-xl');
    if (accessibility.highContrast) document.body.classList.add('high-contrast');
    if (accessibility.reducedMotion) document.body.classList.add('reduced-motion');
    localStorage.setItem('carepilot_accessibility', JSON.stringify(accessibility));
  }, [accessibility]);

  // Persist state updates to localStorage
  useEffect(() => {
    localStorage.setItem('carepilot_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('carepilot_active_report', JSON.stringify(activeReport));
  }, [activeReport]);

  useEffect(() => {
    localStorage.setItem('carepilot_timeline', JSON.stringify(timelineEvents));
  }, [timelineEvents]);

  useEffect(() => {
    localStorage.setItem('carepilot_followups', JSON.stringify(followUps));
  }, [followUps]);

  useEffect(() => {
    localStorage.setItem('carepilot_patient', JSON.stringify(patientProfile));
  }, [patientProfile]);

  // Sync with live FastAPI backend on mount
  useEffect(() => {
    let isMounted = true;
    async function syncWithBackend() {
      const isOnline = await api.checkHealth();
      if (isOnline && isMounted) {
        try {
          const backendRecords = await api.getRecords();
          if (Array.isArray(backendRecords) && backendRecords.length > 0) {
            setRecords((prev) => {
              const existingIds = new Set(prev.map((r) => r.id));
              const newItems = backendRecords.filter((r) => !existingIds.has(r.id));
              return newItems.length > 0 ? [...newItems, ...prev] : prev;
            });
          }
        } catch (e) {
          console.warn("Backend records sync skipped:", e);
        }
      }
    }
    syncWithBackend();
    return () => { isMounted = false; };
  }, []);

  // Status computation logic for lab results
  const computeStatus = (value, refLow, refHigh) => {
    const num = Number(value);
    if (isNaN(num) || refLow == null || refHigh == null) {
      return { status: "Needs verification", isUrgent: false };
    }
    const low = Number(refLow);
    const high = Number(refHigh);

    // Urgent clinical ranges check (e.g. extreme values)
    if (num < low * 0.5 || num > high * 2.2) {
      return { status: "Critical", isUrgent: true };
    }
    if (num < low) {
      return { status: "Low", isUrgent: false };
    }
    if (num > high) {
      return { status: "High", isUrgent: false };
    }
    return { status: "Normal", isUrgent: false };
  };

  // Update extracted value and automatically recompute status and explanations
  const updateExtractedValue = (resultId, updatedFields) => {
    setActiveReport((prev) => {
      const updatedResults = prev.results.map((res) => {
        if (res.id !== resultId) return res;

        const merged = { ...res, ...updatedFields, isEditedByUser: true };
        const { status, isUrgent } = computeStatus(merged.value, merged.refLow, merged.refHigh);
        
        // Update explanation's vsRange text to match new value
        let updatedExplanation = { ...merged.explanation };
        if (status === "Normal") {
          updatedExplanation.vsRange = `Your updated reading of ${merged.value} ${merged.unit} is within the laboratory's normal reference band (${merged.refLow}–${merged.refHigh} ${merged.unit}).`;
          updatedExplanation.nextStep = "Result is within the normal reference band. Continue healthy lifestyle habits.";
        } else if (status === "High") {
          updatedExplanation.vsRange = `Your updated reading of ${merged.value} ${merged.unit} is above the upper reference limit of ${merged.refHigh} ${merged.unit}.`;
          updatedExplanation.nextStep = "Discuss with a qualified healthcare professional during your next scheduled consult.";
        } else if (status === "Low") {
          updatedExplanation.vsRange = `Your updated reading of ${merged.value} ${merged.unit} is below the lower reference limit of ${merged.refLow} ${merged.unit}.`;
          updatedExplanation.nextStep = "Discuss with a qualified healthcare professional regarding nutritional or clinical causes.";
        } else {
          updatedExplanation.vsRange = `Reference range not fully verified. Result marked for clinician verification.`;
          updatedExplanation.nextStep = "Verify with original lab documentation or consulting clinician.";
        }

        return {
          ...merged,
          status,
          isUrgent,
          explanation: updatedExplanation
        };
      });

      return {
        ...prev,
        results: updatedResults
      };
    });
  };

  // Add new uploaded record
  const addUploadedRecord = (newRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  // Delete record with return for undo
  const deleteRecord = (recordId) => {
    const deleted = records.find((r) => r.id === recordId);
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    return deleted;
  };

  const restoreRecord = (recordToRestore) => {
    if (recordToRestore) {
      setRecords((prev) => [recordToRestore, ...prev]);
    }
  };

  // Add timeline event
  const addTimelineEvent = (event) => {
    const newEvent = {
      id: `tl-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      monthGroup: "October 2026",
      ...event
    };
    setTimelineEvents((prev) => [newEvent, ...prev]);
    return newEvent;
  };

  // Follow-up reminders
  const addFollowUp = (item) => {
    const newFollowUp = {
      id: `fu-${Date.now()}`,
      completed: false,
      ...item
    };
    setFollowUps((prev) => [newFollowUp, ...prev]);
  };

  const deleteFollowUp = (id) => {
    setFollowUps((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleFollowUp = (id) => {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === id ? { ...f, completed: !f.completed } : f))
    );
  };

  // Reset to default demo data
  const resetToDefaults = () => {
    localStorage.clear();
    setPatientProfile(initialPatientProfile);
    setRecords(initialRecords);
    setActiveReport(defaultAnalysisReport);
    setTimelineEvents(initialTimelineEvents);
    setFollowUps(initialFollowUps);
  };

  return (
    <HealthDataContext.Provider
      value={{
        patientProfile,
        setPatientProfile,
        records,
        addUploadedRecord,
        deleteRecord,
        restoreRecord,
        activeReport,
        setActiveReport,
        updateExtractedValue,
        timelineEvents,
        addTimelineEvent,
        followUps,
        addFollowUp,
        deleteFollowUp,
        toggleFollowUp,
        accessibility,
        setAccessibility,
        resetToDefaults
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
}

export function useHealthData() {
  const context = useContext(HealthDataContext);
  if (!context) {
    throw new Error('useHealthData must be used within a HealthDataProvider');
  }
  return context;
}
