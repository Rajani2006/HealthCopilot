import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileSearch,
  FolderHeart,
  CalendarDays,
  ActivitySquare,
  Pill,
  MessageSquareText,
  Settings,
  HeartPulse
} from 'lucide-react';
import { useT } from '../../i18n/I18nContext';
import { useHealthData } from '../../context/HealthDataContext';

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useT();
  const { patientProfile } = useHealthData();

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/upload', label: t('nav.upload'), icon: UploadCloud },
    { to: '/analysis', label: t('nav.analysis'), icon: FileSearch },
    { to: '/records', label: t('nav.records'), icon: FolderHeart },
    { to: '/timeline', label: t('nav.timeline'), icon: CalendarDays },
    { to: '/summary', label: t('nav.summary'), icon: ActivitySquare },
    { to: '/scanner', label: t('nav.scanner'), icon: Pill },
    { to: '/assistant', label: t('nav.assistant'), icon: MessageSquareText },
    { to: '/settings', label: t('nav.settings'), icon: Settings }
  ];

  return (
    <>
      {isOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`app-sidebar ${isOpen ? 'mobile-open' : ''}`} aria-label="Main Navigation">
        <div className="sidebar-header">
          <NavLink to="/" className="brand-link" onClick={onClose}>
            <div className="brand-logo-icon">
              <HeartPulse size={20} strokeWidth={2.4} />
            </div>
            <span className="brand-name">{t('brand')}</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
                end={item.to === '/'}
              >
                <Icon className="nav-icon" />
                <span className="nav-text">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar" title={patientProfile.fullName}>
              {patientProfile.initials}
            </div>
            <div className="user-info">
              <span className="user-name">{patientProfile.fullName}</span>
              <span className="user-role">Age {patientProfile.age} • {patientProfile.bloodGroup}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
