import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getHealth } from '../services/api';

const BackendContext = createContext(null);

export function BackendProvider({ children }) {
  const [online, setOnline] = useState(false);
  const [llm, setLlm] = useState(false);
  const [ocrLangs, setOcrLangs] = useState('eng');
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      if (data && (data.status === 'ok' || data.status === 'healthy')) {
        setOnline(true);
        setLlm(Boolean(data.llm));
        setOcrLangs(data.ocrLangs || 'eng');
      } else {
        setOnline(false);
        setLlm(false);
      }
    } catch {
      setOnline(false);
      setLlm(false);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    // Initial health check on mount
    checkHealth();

    // Periodic check every 30 seconds
    const interval = setInterval(() => {
      checkHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkHealth]);

  const demoMode = !online;

  return (
    <BackendContext.Provider
      value={{
        online,
        llm,
        ocrLangs,
        loading,
        lastChecked,
        demoMode,
        checkHealth
      }}
    >
      {children}
    </BackendContext.Provider>
  );
}

export function useBackend() {
  const ctx = useContext(BackendContext);
  if (!ctx) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return ctx;
}
