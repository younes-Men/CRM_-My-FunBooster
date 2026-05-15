import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MondayTable from './components/MondayTable';
import TeamList from './components/TeamList';
import TempRdvZone from './components/TempRdvZone';
import CalendarView from './components/CalendarView';
import Pipeline from './components/Pipeline';
import { getUser } from './lib/authConfig';
import { Eye, EyeOff } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('leads');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('crm_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('crm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('crm_theme', 'light');
    }
  }, [isDarkMode]);

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem('crm_user_data');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (user?.role === 'commercial' && activeTab === 'leads') {
      setActiveTab('pipeline');
    }
  }, [user, activeTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const userData = await getUser(credential);
    
    // Si l'utilisateur existe et que le mot de passe correspond (ou si pas encore de mdp défini dans la DB)
    if (userData) {
      if (!userData.password || userData.password === password) {
        setUser(userData);
        localStorage.setItem('crm_user_data', JSON.stringify(userData));
        if (userData.role === 'commercial') setActiveTab('pipeline');
      } else {
        setLoginError('Mot de passe incorrect.');
      }
    } else {
      setLoginError('Accès non autorisé. Vérifiez votre e-mail.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('crm_user_data');
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
            <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">E-mail</label>
            <input 
              type="text" 
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="Ex: admin@lykos.fr"
              className="bg-navy/5 border border-navy/10 rounded-2xl px-5 py-4 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-navy/20"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">Mot de passe</label>
            <div className="relative group/pass">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Laissez vide si non défini"
                className="w-full bg-navy/5 border border-navy/10 rounded-2xl px-5 py-4 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-navy/20"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-navy/20 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {loginError && <p className="text-primary text-[11px] font-bold text-center animate-pulse">{loginError}</p>}

          <button 
            type="submit"
            className="bg-active text-white font-black py-4 rounded-2xl shadow-xl shadow-active/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
          >
            Se Connecter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background text-navy font-sans flex transition-colors duration-500 ${isDarkMode ? 'dark' : ''}`}>
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
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
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
              <TeamList currentUser={user} />
            ) : activeTab === 'temp-rdv' ? (
              <TempRdvZone user={user} />
            ) : activeTab === 'calendar' ? (
              <CalendarView user={user} isDarkMode={isDarkMode} />
            ) : activeTab === 'pipeline' ? (
              <Pipeline user={user} />
            ) : (
              <MondayTable activeTab={activeTab} user={user} isDarkMode={isDarkMode} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
