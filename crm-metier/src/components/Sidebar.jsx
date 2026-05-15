import React from 'react';
import { 
  Home, 
  LayoutGrid, 
  Table, 
  Bell, 
  Settings, 
  Users, 
  Layers, 
  Plus,
  HelpCircle,
  LogOut,
  Calendar,
  ClipboardList,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import logo2 from '../assets/Logo2.jpeg';

const Sidebar = React.memo(({ user, activeTab, setActiveTab, isExpanded, setIsExpanded, onLogout }) => {
  const isAdmin = user?.role === 'admin';
  const perms = user?.permissions || {};

  const menuItems = [];

  // Lead Management (Hidden for Commercials as they only use Pipeline/RDV list)
  if ((isAdmin || perms.view_leads) && user?.role !== 'commercial') {
    menuItems.push({ id: 'leads', icon: Layers, label: 'Gestion Leads' });
  }

  // Mes RDV / Liste des RDV
  // For Commercials: depends strictly on Accès Leads
  // For FunBoosters: depends on leads or pipeline access
  const canSeeRdv = isAdmin || 
    (user?.role === 'commercial' ? perms.view_leads : (perms.view_leads || perms.view_pipeline));
    
  if (canSeeRdv && (user?.role === 'funebooster' || user?.role === 'commercial')) {
    menuItems.push({ 
      id: 'mes-rdv', 
      icon: UserCheck, 
      label: user?.role === 'commercial' ? 'Liste des RDV' : 'Mes RDV' 
    });
  }

  // Mes Rappels - Specific to FunBoosters
  if (canSeeRdv && user?.role === 'funebooster') {
    menuItems.push({ id: 'mes-rappel', icon: ClipboardList, label: 'Mes Rappels' });
  }

  // Calendar - Checked against permissions
  if (isAdmin || perms.view_agenda) {
    menuItems.push({ id: 'calendar', icon: Calendar, label: 'Calendrier' });
  }

  // Pipeline - Checked against permissions
  if (isAdmin || perms.view_pipeline) {
    menuItems.push({ id: 'pipeline', icon: LayoutGrid, label: 'Pipeline' });
  }

  // Admin Specific Zones & Permitted Access
  if (isAdmin || perms.view_zone_temp) {
    menuItems.push({ id: 'temp-rdv', icon: Bell, label: 'Zone Tampon' });
  }
  
  if (isAdmin) {
    menuItems.push({ id: 'users', icon: Users, label: 'Équipe' });
  }

  return (
    <div 
      className="fixed left-0 top-0 bottom-0 z-[60] flex items-center px-4 pointer-events-none"
    >
      <aside 
        className={`pointer-events-auto relative h-[calc(100vh-48px)] glass-pill rounded-[2.5rem] flex flex-col items-start py-8 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
          isExpanded ? 'w-64 px-6' : 'w-24 items-center px-4'
        }`}
      >
        {/* Toggle Flèche Centrée */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-1/2 -translate-y-1/2 -right-3.5 p-1.5 rounded-full bg-card border border-navy/10 text-navy hover:text-primary hover:border-primary shadow-lg shadow-navy/10 transition-all duration-300 z-50 flex items-center justify-center"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4 ml-[-2px]" /> : <ChevronRight className="w-4 h-4 mr-[-2px]" />}
        </button>

        {/* Logo Section */}
        <div className={`w-full mb-12 flex items-center gap-4 transition-all duration-500 ${isExpanded ? 'px-2' : 'justify-center'}`}>
          <div className={`flex-shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-navy/5 overflow-hidden transition-all duration-500 ${isExpanded ? 'w-12 h-12' : 'w-14 h-14'}`}>
            <img 
              src={logo2} 
              alt="Lykos Logo" 
              className="w-full h-full object-contain p-1.5 transition-all duration-500" 
            />
          </div>
          {isExpanded && (
            <div className="flex flex-col whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="text-lg font-bold text-navy tracking-tight leading-tight font-outfit uppercase">
                My <span className="text-primary">FunBooster</span>
              </span>
              <span className="text-[10px] text-navy/30 font-bold uppercase tracking-[0.25em] mt-0.5">BY DOCENDIA</span>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex flex-col gap-3 w-full">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group relative flex items-center gap-4 w-full h-14 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-active text-white shadow-xl shadow-active/20' 
                  : 'text-navy/40 hover:text-navy hover:bg-navy/5'
              } ${isExpanded ? 'px-4' : 'justify-center'}`}
            >
              <item.icon className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110 group-hover:text-primary'}`} />
              
              {isExpanded && (
                <span className="text-sm font-bold whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500">
                  {item.label}
                </span>
              )}

              {/* Active Indicator */}
              {activeTab === item.id && !isExpanded && (
                <div className="absolute -left-1 w-1.5 h-6 bg-active rounded-full shadow-lg shadow-active/40" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Logout Section */}
        <div className="w-full mb-4 px-2">
          <button
            onClick={onLogout}
            className={`group relative flex items-center gap-4 w-full h-14 rounded-2xl transition-all duration-300 text-navy/30 hover:text-primary hover:bg-primary/5 ${
              isExpanded ? 'px-4' : 'justify-center'
            }`}
          >
            <LogOut className="w-6 h-6 flex-shrink-0 transition-all duration-300 group-hover:scale-110" />
            {isExpanded && (
              <span className="text-sm font-bold whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500">
                Déconnexion
              </span>
            )}
          </button>
        </div>

        {/* Decorative Element */}
        <div className={`w-full flex justify-center opacity-10 transition-opacity duration-500 ${isExpanded ? 'opacity-20' : ''}`}>
          <div className="w-px h-12 bg-gradient-to-b from-navy to-transparent" />
        </div>
      </aside>
    </div>
  );
});

export default Sidebar;
