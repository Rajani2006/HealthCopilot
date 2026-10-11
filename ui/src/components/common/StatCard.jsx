import React from 'react';

export default function StatCard({ title, value, delta, deltaType = 'neutral', icon: Icon }) {
  return (
    <div className="surface-card hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--color-surface-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-cyan)'
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
        <span className="num" style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: 'var(--color-text)',
          lineHeight: 1
        }}>
          {value}
        </span>
        {delta && (
          <span style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            color: deltaType === 'warning' ? 'var(--color-warning)' : deltaType === 'success' ? 'var(--color-success)' : 'var(--color-text-subtle)'
          }}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
