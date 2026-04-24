import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MondayTable from './components/MondayTable';
import TeamList from './components/TeamList';
import CalendarView from './components/CalendarView';
import Pipeline from './components/Pipeline';
import { getUser } from './lib/authConfig';

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('leads');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Check for existing session
  useEffect(() => {
    const savedEmail = localStorage.getItem('crm_user_email');
    if (savedEmail) {
      const userData = getUser(savedEmail);
      if (userData) {
        setUser({ ...userData, email: savedEmail });
        // Set default tab for commercial users
        if (userData.role === 'commercial') setActiveTab('pipeline');
      }
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'commercial' && activeTab === 'leads') {
      setActiveTab('pipeline');
    }
  }, [user, activeTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    const userData = getUser(email);
    if (userData) {
      setUser({ ...userData, email });
      localStorage.setItem('crm_user_email', email);
      setLoginError('');
    } else {
      setLoginError('Accès non autorisé. Vérifiez votre e-mail.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('crm_user_email');
    setActiveTab('leads');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-navy flex items-center justify-center p-6 transition-colors duration-500">
        {/* Modern light background patterns */}
        <div className="fixed inset-0 pointer-events-none opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-navy/10 rounded-full blur-[120px]" />
        </div>
        
        <form onSubmit={handleLogin} className="glass-pill p-10 rounded-[3rem] w-full max-w-md flex flex-col gap-6 relative z-10 shadow-2xl border-white ring-1 ring-navy/5">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold tracking-tight text-navy mb-2 font-outfit uppercase">
              My <span className="text-primary">FunBooster</span>
            </h1>
            <p className="text-[10px] font-bold text-navy/40 uppercase tracking-[0.2em]">Espace Collaborateur</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">E-mail de connexion</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="bg-navy/5 border border-navy/10 rounded-2xl px-5 py-4 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-navy/20"
              required
            />
          </div>

          {loginError && <p className="text-primary text-[11px] font-bold text-center animate-pulse">{loginError}</p>}

          <button 
            type="submit"
            className="bg-navy text-white font-black py-4 rounded-2xl shadow-xl shadow-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
          >
            Identifier
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-navy font-sans flex transition-colors duration-500">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-[20%] w-[50%] h-[30%] bg-primary/10 rounded-full blur-[150px]" />
      </div>

      {/* Floating Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        onLogout={handleLogout}
      />

      {/* Main area */}
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-500 ${isSidebarExpanded ? 'ml-72' : 'ml-32'}`}>
        <Header 
          activeTab={activeTab} 
          user={user} 
        />

        <main className={`flex-1 min-w-0 overflow-x-auto ${activeTab === 'calendar' ? 'pt-0 px-4 pb-4' : 'pt-4 px-10 pb-12'}`}>
          {/* Section Header - Hidden for Calendar to save space */}
          {activeTab !== 'calendar' && (
            <div className="mb-10 pt-2 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-navy tracking-tight leading-tight font-outfit uppercase">
                  {activeTab === 'users' ? 'Équipe' : 
                   activeTab === 'mes-rdv' ? 'Liste des ' : 'Gestion des '}
                  {activeTab !== 'users' && (
                    <span className="text-primary">
                      {activeTab === 'mes-rdv' ? 'RDV' : 'Leads'}
                    </span>
                  )}
                </h1>
                <p className="text-[11px] font-bold text-navy/30 uppercase tracking-[0.25em] mt-1">
                  {activeTab === 'users' ? 'Liste globale des collaborateurs CRM' : 
                   activeTab === 'mes-rdv' ? 'Vos rendez-vous qualifiés' : 'Base de données centralisée'}
                </p>
              </div>
              
              <div className="h-10 w-px bg-navy/5" />
            </div>
          )}

          {/* Dynamic Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'users' ? (
              <TeamList />
            ) : activeTab === 'calendar' ? (
              <CalendarView user={user} />
            ) : activeTab === 'pipeline' ? (
              <Pipeline user={user} />
            ) : (
              <MondayTable activeTab={activeTab} user={user} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
