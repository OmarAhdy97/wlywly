import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import QuickActionModal from './components/layout/QuickActionModal';
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

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--primary-700)',
        fontSize: '1.2rem',
        fontWeight: 'bold',
      }}>
        جاري تحميل الأجندة القضائية...
      </div>
    );
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
          />

          <main className="main-content-scroll">
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
    </AuthProvider>
  );
}
