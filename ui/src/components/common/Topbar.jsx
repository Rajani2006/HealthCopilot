import React from 'react';
import { Menu, Globe, Sparkles, Cpu } from 'lucide-react';
import { useT } from '../../i18n/I18nContext';
import { useBackend } from '../../context/BackendContext';

export default function Topbar({ onToggleMobileMenu, title }) {
  const { lang, setLang, availableLanguages } = useT();
  const { online, llm } = useBackend();

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation drawer"
        >
          <Menu size={22} />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {online ? (
            <div
              className="backend-connected-pill"
              role="status"
              aria-label="Live backend active"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: 'rgb(74, 222, 128)'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'rgb(74, 222, 128)',
                  boxShadow: '0 0 6px rgba(74, 222, 128, 0.8)'
                }}
                aria-hidden="true"
              />
              <span>LIVE</span>
            </div>
          ) : (
            <div
              className="demo-pill"
              role="status"
              aria-label="Demo mode active"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: 'rgb(251, 191, 36)'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'rgb(251, 191, 36)'
                }}
                aria-hidden="true"
              />
              <span>DEMO DATA</span>
            </div>
          )}

          {/* Tiny AI / Rule-based label */}
          <div
            className="topbar-ai-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: llm ? 'var(--color-cyan, #35D6E8)' : 'var(--color-text-subtle, #94a3b8)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
            title={llm ? "Anthropic Claude connected" : "Rule-based answers active"}
          >
            {llm ? <Sparkles size={11} color="var(--color-cyan, #35D6E8)" /> : <Cpu size={11} />}
            <span>{llm ? "AI connected" : "Rule-based answers"}</span>
          </div>
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={16} color="var(--color-text-muted)" aria-hidden="true" />
          <select
            className="input-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '13px',
              width: 'auto',
              cursor: 'pointer',
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)'
            }}
            aria-label="Select application language"
          >
            {availableLanguages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native} ({l.label})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
