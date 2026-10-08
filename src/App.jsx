import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import QuickActionModal from './components/layout/QuickActionModal';
import SubTabs from './components/layout/SubTabs';
import CommandPalette from './components/layout/CommandPalette';
import DialogHost from './components/common/DialogHost';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AgendaPage from './pages/AgendaPage';
import CalendarPage from './pages/CalendarPage';
import CasesPage from './pages/CasesPage';
import ClientsPage from './pages/ClientsPage';
import ArchivePage from './pages/ArchivePage';
import TeamPage from './pages/TeamPage';
import SearchDeadlinesPage from './pages/SearchDeadlinesPage';
import AdministrativePage from './pages/AdministrativePage';
import BailiffsPage from './pages/BailiffsPage';
import ProfilePage from './pages/ProfilePage';
import LegalFormulasPage from './pages/LegalFormulasPage';
import FinancePage from './pages/FinancePage';
import LibraryPage from './pages/LibraryPage';
import useResponsiveTables from './lib/useResponsiveTables';
import useModalSafety from './lib/useModalSafety';

function MainApp() {
  const { user, loading } = useAuth();
  useResponsiveTables();
  useModalSafety();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Theme management (Dark / Light)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return <div className="app-loading">جاري تحميل الديوان...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <DataProvider>
      <div className="app-container">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isDark={isDark} 
          toggleTheme={toggleTheme} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="main-content">
          <Header 
            user={user} 
            onOpenQuickAction={() => setIsQuickActionOpen(true)}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setActiveTab={setActiveTab}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onOpenPalette={() => setIsPaletteOpen(true)}
          />

          <main className="main-content-scroll">
            <SubTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'dashboard' && (
              <DashboardPage 
                setActiveTab={setActiveTab} 
              />
            )}

            {activeTab === 'agenda' && (
              <AgendaPage />
            )}

            {activeTab === 'calendar' && (
              <CalendarPage 
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'cases' && (
              <CasesPage />
            )}

            {activeTab === 'formulas' && (
              <LegalFormulasPage />
            )}

            {activeTab === 'administrative' && (
              <AdministrativePage />
            )}

            {activeTab === 'bailiffs' && (
              <BailiffsPage />
            )}

            {activeTab === 'clients' && (
              <ClientsPage 
                setActiveTab={setActiveTab} 
              />
            )}

            {activeTab === 'library' && (
              <LibraryPage />
            )}

            {activeTab === 'finance' && (
              <FinancePage />
            )}

            {activeTab === 'archive' && (
              <ArchivePage />
            )}

            {activeTab === 'team' && (
              <TeamPage />
            )}

            {activeTab === 'search' && (
              <SearchDeadlinesPage 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'profile' && (
              <ProfilePage />
            )}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
        />

        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          setActiveTab={setActiveTab}
        />

        {/* Global Quick Action Modal */}
        <QuickActionModal 
          isOpen={isQuickActionOpen} 
          onClose={() => setIsQuickActionOpen(false)} 
        />
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
      <DialogHost />
    </AuthProvider>
  );
}

