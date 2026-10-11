import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileSearch,
  FolderHeart,
  CalendarDays,
  ActivitySquare,
  Pill,
  MessageSquareText,
  Settings as SettingsIcon,
  HelpCircle
} from 'lucide-react';
import { I18nProvider, useT } from './i18n/I18nContext';
import { ToastProvider } from './context/ToastContext';
import { BackendProvider } from './context/BackendContext';
import { HealthDataProvider } from './context/HealthDataContext';

import Sidebar from './components/common/Sidebar';
import Topbar from './components/common/Topbar';

import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ReportAnalysis from './pages/ReportAnalysis';
import HealthRecords from './pages/HealthRecords';
import Timeline from './pages/Timeline';
import HealthSummary from './pages/HealthSummary';
import MedicineScanner from './pages/MedicineScanner';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';

import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';

function MainLayout() {
  const { t } = useT();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive current page title
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return t('nav.dashboard');
      case '/upload':
        return t('nav.upload');
      case '/analysis':
        return t('nav.analysis');
      case '/records':
        return t('nav.records');
      case '/timeline':
        return t('nav.timeline');
      case '/summary':
        return t('nav.summary');
      case '/scanner':
        return t('nav.scanner');
      case '/assistant':
        return t('nav.assistant');
      case '/settings':
        return t('nav.settings');
      default:
        return 'CarePilot AI';
    }
  };

  const title = getPageTitle(location.pathname);

  return (
    <div className="app-container">
      {/* Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="app-main-wrapper">
        {/* Topbar */}
        <Topbar
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          title={title}
        />

        {/* Dynamic Route Content */}
        <main className="app-content" id="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/analysis" element={<ReportAnalysis />} />
            <Route path="/analysis/:recordId" element={<ReportAnalysis />} />
            <Route path="/records" element={<HealthRecords />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/summary" element={<HealthSummary />} />
            <Route path="/scanner" element={<MedicineScanner />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Mobile Tab Bar (<700px) */}
        <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
          <NavLink to="/" className={({ isActive }) => `mobile-tab-item ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard className="tab-icon" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `mobile-tab-item ${isActive ? 'active' : ''}`}>
            <UploadCloud className="tab-icon" />
            <span>Upload</span>
          </NavLink>
          <NavLink to="/analysis" className={({ isActive }) => `mobile-tab-item ${isActive ? 'active' : ''}`}>
            <FileSearch className="tab-icon" />
            <span>Analysis</span>
          </NavLink>
          <NavLink to="/timeline" className={({ isActive }) => `mobile-tab-item ${isActive ? 'active' : ''}`}>
            <CalendarDays className="tab-icon" />
            <span>Timeline</span>
          </NavLink>
          <NavLink to="/assistant" className={({ isActive }) => `mobile-tab-item ${isActive ? 'active' : ''}`}>
            <MessageSquareText className="tab-icon" />
            <span>Assistant</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <BackendProvider>
          <HealthDataProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <MainLayout />
            </BrowserRouter>
          </HealthDataProvider>
        </BackendProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
