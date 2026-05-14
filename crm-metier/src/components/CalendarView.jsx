import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  Building2, 
  Filter, 
  ExternalLink,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PipelineDetail from './PipelineDetail';
import LeadDetailPanel from './LeadDetailPanel';

const CALENDAR_COLORS = {
  'ca conseils':  { bg: '#fff7ed', border: '#f97316', dot: '#f97316', text: '#9a3412' },
  'tb formations': { bg: '#eff6ff', border: '#3b82f6', dot: '#3b82f6', text: '#1e40af' },
  'go conseils':   { bg: '#f0fdf4', border: '#22c55e', dot: '#22c55e', text: '#166534' },
  'hors zone':     { bg: '#fdf2f8', border: '#ec4899', dot: '#ec4899', text: '#9d174d' },
  'default':       { bg: '#f1f5f9', border: '#94a3b8', dot: '#94a3b8', text: '#475569' },
};

const CLIENTS = Object.keys(CALENDAR_COLORS).filter(c => c !== 'default');

const CalendarView = ({ user }) => {
  const isCommercial = user?.role === 'commercial';
  
  const allowedClients = useMemo(() => {
    const getClean = (val) => {
      if (!val) return null;
      try {
        const parsed = typeof val === 'string' && val.startsWith('[') ? JSON.parse(val) : val;
        const res = Array.isArray(parsed) ? parsed[0] : parsed;
        return res ? String(res).toLowerCase().trim() : null;
      } catch (e) {
        return String(val).replace(/[\[\]"]/g, '').toLowerCase().trim();
      }
    };

    if (isCommercial && user.client) {
      const clean = getClean(user.client);
      return clean ? [clean] : [];
    }
    if (user?.permissions?.agenda_clients) {
      const perms = user.permissions.agenda_clients.map(c => getClean(c)).filter(Boolean);
      if (perms.includes('tous les clients')) return CLIENTS;
      const valid = perms.filter(c => CLIENTS.includes(c));
      if (valid.length > 0) return valid;
    }
    return CLIENTS;
  }, [user, isCommercial]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([allowedClients[0]]);
  const [activeCommercials, setActiveCommercials] = useState(
    user?.role === 'funebooster' && user?.permissions?.assigned_commercials?.length > 0 
      ? [user.permissions.assigned_commercials[0]] 
      : []
  );
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [commercialsForClient, setCommercialsForClient] = useState([]);

  // Fetch commercials for the selected client (for Admin/Funbooster filters)
  useEffect(() => {
    const fetchCommercials = async () => {
      const activeClient = activeFilters[0];
      if (!activeClient || !supabase) return;

      // Logic for ADMIN: Show ALL commercials assigned to this client
      if (user?.role === 'admin') {
        const { data, error } = await supabase
          .from('team_members')
          .select('name, client')
          .eq('role', 'commercial')
          .eq('is_active', true);

        if (!error && data) {
          const filtered = data.filter(m => {
            let memberClients = [];
            try {
              if (Array.isArray(m.client)) {
                memberClients = m.client;
              } else if (typeof m.client === 'string') {
                if (m.client.startsWith('[') || m.client.startsWith('{')) {
                  memberClients = JSON.parse(m.client);
                } else {
                  memberClients = m.client.split(',').map(c => c.trim());
                }
              }
            } catch (e) {
              const matches = String(m.client).match(/"([^"]+)"/g);
              memberClients = matches ? matches.map(m => m.replace(/"/g, '').trim()) : [m.client];
            }
            if (!Array.isArray(memberClients)) memberClients = [memberClients];
            return memberClients.some(c => String(c).toLowerCase() === activeClient.toLowerCase());
          });
          setCommercialsForClient(filtered.map(f => f.name));
        }
      } 
      // Logic for FUNBOOSTER: Filter assigned commercials by the active client
      else if (user?.role === 'funebooster') {
        const assignedNames = user?.permissions?.assigned_commercials || [];
        const { data, error } = await supabase
          .from('team_members')
          .select('name, client')
          .in('name', assignedNames)
          .eq('is_active', true);

        if (!error && data) {
          const filtered = data.filter(m => {
            let memberClients = [];
            try {
              if (Array.isArray(m.client)) {
                memberClients = m.client;
              } else if (typeof m.client === 'string') {
                if (m.client.startsWith('[') || m.client.startsWith('{')) {
                  memberClients = JSON.parse(m.client);
                } else {
                  memberClients = m.client.split(',').map(c => c.trim());
                }
              }
            } catch (e) {
              const matches = String(m.client).match(/"([^"]+)"/g);
              memberClients = matches ? matches.map(m => m.replace(/"/g, '').trim()) : [m.client];
            }
            if (!Array.isArray(memberClients)) memberClients = [memberClients];
            return memberClients.some(c => String(c).toLowerCase() === activeClient.toLowerCase());
          });
          setCommercialsForClient(filtered.map(f => f.name));
        }
      }
    };
    fetchCommercials();
  }, [activeFilters, supabase, user]);

  // Fetch RDV data
  useEffect(() => {
    fetchRDVs();

    // Real-time subscription for instant updates
    const channel = supabase
      .channel('calendar_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        fetchRDVs();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchRDVs = async () => {
    setLoading(true);
    let query = supabase
      .from('crm_leads')
      .select('*')
      .eq('status', 'RDV')
      .not('date_rdv', 'is', null);

    if (isCommercial && user.client) {
      let clientList = [];
      try {
        const raw = user.client;
        if (typeof raw === 'string' && raw.startsWith('[')) {
          clientList = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          clientList = raw;
        } else {
          clientList = String(raw).split(',').map(c => c.trim()).filter(Boolean);
        }
      } catch (e) {
        clientList = [String(user.client).replace(/[\[\]"]/g, '')];
      }
      
      if (clientList.length > 0) {
        query = query.in('client_of', clientList);
      }

      if (user.name) {
        // Use ilike for case-insensitive matching and handle unassigned leads for their clients
        query = query.or(`opcosign.ilike."${user.name}",opcosign.is.null`);
      }
    } else if (user?.role === 'funebooster' || user?.role === 'funbooster') {
      const assigned = user?.permissions?.assigned_commercials || [];
      if (assigned.length > 0) {
        query = query.in('opcosign', assigned);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      // Filter out clients not requested by user (like IT PERFORMANCE)
      const validEvents = data.filter(e => 
        e.client_of && CLIENTS.includes(e.client_of.toLowerCase())
      );
      setEvents(validEvents);
    }
    setLoading(false);
  };

  // Calendar Logic
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday

  const calendarDays = useMemo(() => {
    const days = [];
    let day = new Date(startDate);
    while (day <= endDate) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const toggleFilter = (client) => {
    setActiveFilters([client]);
    setActiveCommercials([]); // Reset commercial selection when switching clients
  };

  const toggleCommercial = (comm) => {
    setActiveCommercials(prev => 
      prev.includes(comm) ? prev.filter(c => c !== comm) : [...prev, comm]
    );
  };

  const getEventsForDay = (day) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return events.filter(e => {
      if (e.date_rdv !== dateStr) return false;
      if (!activeFilters.includes(e.client_of?.toLowerCase())) return false;
      
      // Commercial Filtering
      if (activeCommercials.length > 0) {
        if (!activeCommercials.includes(e.opcosign)) return false;
      }
      
      return true;
    }).sort((a, b) => (a.heure_rdv || '').localeCompare(b.heure_rdv || ''));
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── Integrated Google-style Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-navy/5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-8">
          {/* Month & Nav */}
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-navy capitalize min-w-[160px]">
              {monthName}
            </h2>
            <div className="flex items-center gap-1 bg-navy/5 p-1 rounded-xl">
              <button onClick={prevMonth} className="p-2 hover:bg-white hover:text-primary rounded-lg transition-all text-navy/40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={goToToday} className="px-4 py-1.5 text-[10px] font-black uppercase text-navy hover:bg-white rounded-lg transition-all tracking-wider">
                Aujourd'hui
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-white hover:text-primary rounded-lg transition-all text-navy/40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-navy/10" />

          {/* Professional Agenda Switcher / Tabs */}
          <div className="flex items-center bg-navy/[0.03] p-1.5 rounded-[1rem] border border-navy/5">
            {allowedClients.map(client => {
              const isActive = activeFilters[0] === client;
              const color = CALENDAR_COLORS[client] || CALENDAR_COLORS.default;
              return (
                <button
                  key={client}
                  onClick={() => toggleFilter(client)}
                  className={`relative flex items-center gap-2.5 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    isActive 
                      ? 'bg-white text-navy shadow-md shadow-navy/5 ring-1 ring-navy/5' 
                      : 'text-navy/40 hover:text-navy hover:bg-navy/5'
                  }`}
                >
                  <div 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isActive ? 'scale-100' : 'scale-75 opacity-50'}`}
                    style={{ backgroundColor: color.dot }}
                  />
                  {client}
                </button>
              );
            })}
          </div>

          {/* Commerciaux info for Funbooster & Admin */}
          {activeFilters[0] && commercialsForClient.length > 0 && (
            <div className="flex items-center gap-4 ml-2">
              <div className="h-8 w-px bg-navy/10 hidden md:block" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-navy/30 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Filtrer par commercial
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveCommercials([])}
                    className={`px-3 py-1.5 border shadow-sm rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                      activeCommercials.length === 0
                        ? 'bg-navy text-white scale-105 shadow-lg shadow-navy/20'
                        : 'bg-white border-navy/10 text-navy/40 hover:bg-navy/5 hover:text-navy/70'
                    }`}
                  >
                    Tous
                  </button>
                  {commercialsForClient.map(comm => {
                    const isCommActive = activeCommercials.includes(comm);
                    return (
                      <button
                        key={comm}
                        onClick={() => toggleCommercial(comm)}
                        className={`px-3 py-1.5 border shadow-sm rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                          isCommActive
                            ? 'bg-primary text-white border-primary scale-105 shadow-lg shadow-primary/20'
                            : 'bg-white border-navy/10 text-navy/40 hover:bg-navy/5 hover:text-navy/70'
                        }`}
                      >
                        {comm}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-navy/30 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest">MaJ...</span>
          </div>
        )}
      </div>

      {/* ── Main Calendar Grid ── */}
      <div className="flex-1 flex flex-col bg-white border border-navy/5 overflow-hidden shadow-xl rounded-[2rem]">

        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-navy/5 bg-navy/[0.01]">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
            <div key={d} className="py-3 text-center text-[10px] font-black text-navy/20 uppercase tracking-[0.2em] italic border-r border-navy/5 last:border-0">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Content */}
        <div 
          className="flex-1 grid grid-cols-7 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${calendarDays.length / 7}, 1fr)` }}
        >
          {calendarDays.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dayEvents = getEventsForDay(day);

            return (
              <div 
                key={i} 
                className={`p-2 border-r border-b border-navy/5 flex flex-col gap-1 transition-colors ${
                  isCurrentMonth ? 'bg-white' : 'bg-navy/[0.01] opacity-60'
                } ${isToday ? 'bg-primary/[0.02]' : ''}`}
              >
                <div className="flex items-center justify-between px-1">
                  <span className={`text-xs font-black p-1 w-6 h-6 flex items-center justify-center rounded-lg ${
                    isToday ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 'text-navy/30'
                  }`}>
                    {day.getDate()}
                  </span>
                </div>

                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, 4).map(event => {
                    const client = event.client_of?.toLowerCase();
                    const style = CALENDAR_COLORS[client] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' };
                    
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedLeadId(event.id)}
                        className="group flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded-md hover:bg-navy/5 transition-all text-left cursor-pointer overflow-hidden"
                      >
                        {/* Dot Indicator */}
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: style.dot }}
                        />
                        
                        {/* Time */}
                        <span className="text-[10px] font-bold text-navy opacity-60 flex-shrink-0">
                          {(() => {
                            const t = event.heure_rdv;
                            if (!t || t === '-' || t === ':') return '--h--';
                            const [h, m] = t.split(/[:hH]/);
                            return `${(h || '00').padStart(2, '0')}h${(m || '00').substring(0, 2).padStart(2, '0')}`;
                          })()}
                        </span>

                        {/* Company Name */}
                        <span className="text-[10px] font-bold text-navy truncate uppercase tracking-tighter">
                          {event.nom_entreprise}
                        </span>
                      </button>
                    );
                  })}

                  {dayEvents.length > 4 && (
                    <div className="px-2 py-1 text-[10px] font-black text-navy/30 uppercase tracking-widest italic">
                      + {dayEvents.length - 4} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Conditional Detail Panel ── */}
      {selectedLeadId && (
        user?.role === 'funebooster' || user?.role === 'funbooster' ? (
          <LeadDetailPanel 
            leadId={selectedLeadId}
            lead={events.find(l => l.id === selectedLeadId)}
            onClose={() => setSelectedLeadId(null)}
            userName={user?.name}
            userRole={user?.role}
            permissions={user?.permissions}
            onUpdate={(id, updates) => {
              setEvents(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
            }}
          />
        ) : (
          <PipelineDetail 
            lead={events.find(l => l.id === selectedLeadId)}
            onClose={() => setSelectedLeadId(null)}
            user={user}
            source="Agenda"
            onUpdateLead={(id, updates) => {
              setEvents(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
            }}
          />
        )
      )}
    </div>
  );
};

const UserCheck = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);

export default CalendarView;
