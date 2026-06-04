import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutGrid, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  Phone,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  Star,
  CheckCircle2,
  AlertCircle,
  Hash,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PipelineDetail from './PipelineDetail';

const PipelineFunnel = ({ stats }) => {
  if (!stats) return null;
  
  // Funnel steps in logical order
  const steps = [
    stats.find(s => s.label === 'Propositions'),
    stats.find(s => s.label === 'Signés'),
    stats.find(s => s.label === 'Gagnés'),
  ].filter(Boolean);

  return (
    <div className="bg-card p-10 rounded-[2.5rem] border border-navy/5 shadow-sm mb-10 overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.02] rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/[0.05] transition-colors duration-1000" />
      
      <div className="flex items-center justify-between mb-10 relative z-10">
        <div>
          <h4 className="text-lg font-black text-navy tracking-tight">Tunnel de Conversion</h4>
          <p className="text-[10px] font-bold text-navy/30 uppercase tracking-widest mt-1">Analyse du flux de signatures</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black text-green-700 uppercase tracking-wider">Temps Réel</span>
        </div>
      </div>

      <div className="flex items-end gap-1 relative z-10 min-h-[160px]">
        {steps.map((step, i) => {
          const height = Math.max(20, step.perc);
          return (
            <div key={step.label} className="flex-1 flex flex-col items-center gap-4 group/step">
              {/* Count Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.2 }}
                className="px-3 py-1 rounded-full bg-active text-white text-[10px] font-black shadow-lg shadow-active/20"
              >
                {step.count}
              </motion.div>

              {/* Funnel Bar */}
              <div className="w-full relative flex items-end justify-center px-4">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${height * 1.5}px` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100, delay: i * 0.1 }}
                  className="w-full rounded-t-3xl relative overflow-hidden"
                  style={{ backgroundColor: step.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-4 bg-white/20 blur-sm" />
                </motion.div>

                {/* Connector Line (except last) */}
                {i < steps.length - 1 && (
                  <div className="absolute top-1/2 left-1/2 w-full h-px border-t-2 border-dashed border-navy/10 -z-10" />
                )}
              </div>

              {/* Label */}
              <div className="text-center">
                <p className="text-[10px] font-black text-navy uppercase tracking-widest">{step.label}</p>
                <p className="text-[14px] font-black text-navy/40">{step.perc}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PipelineStats = ({ leads, getLeadsByStatus }) => {
  const stats = React.useMemo(() => {
    const total = leads.length;
    // Removed: if (total === 0) return null;

    const countBy = (id) => getLeadsByStatus(id).length;
    
    const signed = countBy('Signé');
    const won = countBy('Gagné');
    const organized = countBy('ORGANISÉ');
    const prop = countBy('Proposition');
    const lost = leads.filter(l => 
      l.status_rdv?.toUpperCase() === 'PERDU' || l.status?.toUpperCase() === 'PERDU'
    ).length;

    const getP = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

    return [
      { label: 'Propositions', count: prop, perc: getP(prop), color: '#ef4444', icon: FileText },
      { label: 'Signés', count: signed, perc: getP(signed), color: '#3b82f6', icon: CheckCircle2 },
      { label: 'Gagnés', count: won, perc: getP(won), color: '#22c55e', icon: Star },
      { label: 'Organisés', count: organized, perc: getP(organized), color: '#06b6d4', icon: Calendar },
      { label: 'Perdus', count: lost, perc: getP(lost), color: '#94a3b8', icon: X }
    ];
  }, [leads, getLeadsByStatus]);

  // Always show stats area even if empty
  const displayStats = stats || [
    { label: 'Propositions', count: 0, perc: 0, color: '#ef4444', icon: FileText },
    { label: 'Signés', count: 0, perc: 0, color: '#3b82f6', icon: CheckCircle2 },
    { label: 'Gagnés', count: 0, perc: 0, color: '#22c55e', icon: Star },
    { label: 'Organisés', count: 0, perc: 0, color: '#06b6d4', icon: Calendar },
    { label: 'Perdus', count: 0, perc: 0, color: '#94a3b8', icon: X }
  ];

  return (
    <div className="flex flex-col gap-6 mb-2">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {displayStats.map((s, i) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card p-6 rounded-[2rem] border border-navy/5 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
          >
            {/* Background Gradient Detail */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-navy/[0.02] rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-navy/[0.03] text-navy/40 group-hover:text-white group-hover:bg-active transition-all duration-300">
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-navy/20 uppercase tracking-widest leading-none mb-1">Ratio</span>
                  <span className="text-sm font-black text-navy">{s.perc}%</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                <h4 className="text-3xl font-black text-navy tracking-tighter">{s.count}</h4>
              </div>

              {/* Micro Chart/Progress */}
              <div className="h-1.5 w-full bg-navy/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${s.perc}%` }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: s.color }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Visual Funnel Diagram */}
      <PipelineFunnel stats={stats} />
    </div>
  );
};

import { FileText, X } from 'lucide-react';

// Columns will be fetched dynamically from crm_column_configs

// ─── Custom Date Picker ──────────────────────────────────────────────────────
const CustomDatePicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const DAYS_FR = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // First day of month: 0=Sun → convert to Mon-based
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  const handleDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Choisir une date';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${
          value ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-navy/50 border-navy/10 hover:border-primary/30'
        }`}
      >
        <Calendar className="w-3.5 h-3.5" />
        {displayValue}
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-1 text-primary/40 hover:text-primary font-black cursor-pointer"
          >×</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-navy/10 p-4 w-64 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-navy/5 text-navy/40 hover:text-navy transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-navy">{MONTHS_FR[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-navy/5 text-navy/40 hover:text-navy transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map(d => (
              <div key={d} className="text-center text-[9px] font-black text-navy/30 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSelected = selectedDate && day === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();
              return (
                <button
                  key={day}
                  onClick={() => handleDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30' :
                    isToday ? 'bg-primary/10 text-primary' :
                    'hover:bg-navy/5 text-navy/70'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-navy/5 flex justify-between">
            <button onClick={() => { onChange(''); setOpen(false); }} className="text-[10px] font-bold text-navy/30 hover:text-navy transition-colors uppercase tracking-wider">Effacer</button>
            <button onClick={() => { const t = today; const mm = String(t.getMonth()+1).padStart(2,'0'); const dd = String(t.getDate()).padStart(2,'0'); onChange(`${t.getFullYear()}-${mm}-${dd}`); setOpen(false); }} className="text-[10px] font-bold text-primary hover:text-primary/70 transition-colors uppercase tracking-wider">Aujourd'hui</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Pipeline = ({ user }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [pipelineColumns, setPipelineColumns] = useState([]);
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'tomorrow' | 'week' | 'custom'
  const [customDate, setCustomDate] = useState('');

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from('crm_column_configs')
      .select('*')
      .eq('key', 'status_rdv')
      .single();
    
    if (data && data.options) {
      const cols = data.options.map(opt => {
        const [label, color, visibility] = opt.split('::');
        return { 
          id: label, 
          label: label, 
          color: color || '#6d28d9', 
          isHidden: visibility === 'h' 
        };
      }).filter(c => !c.isHidden);
      setPipelineColumns(cols);
    } else {
      // Fallback to defaults if no config
      setPipelineColumns([
        { id: 'Nouveau', label: 'Nouveau', color: '#6d28d9' },
        { id: 'RAP', label: 'RAP', color: '#94a3b8' },
        { id: 'Proposition', label: 'Proposition', color: '#ef4444' },
        { id: 'Signé', label: 'Signé', color: '#3b82f6' },
        { id: 'PEC', label: 'PEC', color: '#1e293b' },
        { id: 'Gagné', label: 'Gagné', color: '#22c55e' },
        { id: 'ORGANISÉ', label: 'ORGANISÉ', color: '#06b6d4' },
      ]);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    
    let query = supabase.from('crm_leads')
      .select('*')
      .or('status_rdv.not.is.null,status.in.(RDV,RAPPEL,SIGNE)');
    if (user.role === 'commercial' && user.client) {
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
        // Use case-insensitive matching for opcosign
        query = query.or(`opcosign.ilike."${user.name}",opcosign.is.null`);
      }
    } else if (user?.role === 'funebooster') {
      const assigned = user?.permissions?.assigned_commercials || [];
      if (assigned.length > 0) {
        query = query.in('opcosign', assigned);
      }
    }

    const { data, error } = await query.order('date_modification', { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConfig();
    fetchLeads();
    const channel = supabase
      .channel('pipeline_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_column_configs' }, () => {
        fetchConfig();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchLeads, fetchConfig]);

  const updateLeadStatus = async (id, newStatus) => {
    if (!supabase) return;
    // Reset logic to ensure tickets move correctly between columns
    let updates = { 
      date_modification: new Date().toISOString(),
      status_rdv: newStatus
    };

    switch (newStatus) {
      case 'Nouveau':
        updates.status_rdv = 'Nouveau';
        updates.proposition = null;
        updates.signe = null;
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'RAP':
        updates.status_rdv = 'RAP';
        updates.proposition = null;
        updates.signe = null;
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'Proposition':
        updates.status_rdv = 'Proposition';
        updates.proposition = 'OUI';
        updates.signe = null;
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'Signé':
        updates.status_rdv = 'Signé';
        updates.signe = 'OUI';
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'PEC':
        updates.status_rdv = 'PEC';
        updates.pec = 'OUI';
        updates.signe = null;
        updates.suivi_formation = null;
        break;
      case 'Gagné':
        updates.status_rdv = 'Gagné';
        updates.signe = 'OUI';
        updates.pec = 'OUI';
        updates.suivi_formation = null;
        break;
      case 'ORGANISÉ':
        updates.status_rdv = 'ORGANISÉ';
        updates.suivi_formation = 'ORGANISÉE';
        break;
      case 'Perdu':
        updates.status_rdv = 'Perdu';
        break;
      default:
        break;
    }
    const { error } = await supabase.from('crm_leads').update(updates).eq('id', id);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }
  };

  const updateLead = async (id, updates) => {
    if (!supabase) return;
    const { error } = await supabase.from('crm_leads').update({
      ...updates,
      date_modification: new Date().toISOString()
    }).eq('id', id);
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, date_modification: new Date().toISOString() } : l));
  };

  const getDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

    if (dateFilter === 'today') return { from: today, to: tomorrow };
    if (dateFilter === 'yesterday') return { from: yesterday, to: today };
    if (dateFilter === 'tomorrow') return { from: tomorrow, to: new Date(tomorrow.getTime() + 86400000) };
    if (dateFilter === 'week') return { from: today, to: weekEnd };
    if (dateFilter === 'custom' && customDate) {
      const d = new Date(customDate); d.setHours(0, 0, 0, 0);
      const dNext = new Date(d); dNext.setDate(d.getDate() + 1);
      return { from: d, to: dNext };
    }
    return null;
  }, [dateFilter, customDate]);

  const getLeadsByStatus = (status) => {
    return leads.filter(l => {
      const matchesSearch = !searchQuery || l.nom_entreprise?.toLowerCase().includes(searchQuery.toLowerCase()) || l.siret?.includes(searchQuery);
      if (!matchesSearch) return false;
      if (!l.status_rdv?.toUpperCase() === status?.toUpperCase()) return false;
      if (getDateRange && l.date_rdv) {
        const rdvDate = new Date(l.date_rdv);
        if (rdvDate < getDateRange.from || rdvDate >= getDateRange.to) return false;
      } else if (getDateRange && !l.date_rdv) {
        return false;
      }
      return l.status_rdv?.toUpperCase() === status?.toUpperCase();
    });
  }

  const formatCurrency = (val) => {
    if (!val) return '0 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-12 h-12 border-4 border-navy/10 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.3em]">Chargement...</span>
      </div>
    );
  }

  const DATE_FILTERS = [
    { id: 'all', label: 'Tous' },
    { id: 'yesterday', label: 'Hier' },
    { id: 'today', label: "Aujourd'hui" },
    { id: 'tomorrow', label: 'Demain' },
    { id: 'week', label: '7 prochains jours' },
    { id: 'custom', label: 'Date précise' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-700">
      {/* Search & Actions - Light Mode */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-2 px-1">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-navy leading-none mb-1">Pipeline</span>
            <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em]">
              {(() => {
                const raw = user.client;
                if (!raw) return 'Général';
                try {
                  const parsed = typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{')) ? JSON.parse(raw) : raw;
                  if (Array.isArray(parsed)) return parsed.join(', ');
                  return String(parsed);
                } catch (e) {
                  return String(raw).replace(/[\[\]"]/g, '');
                }
              })()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy/20 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une opportunité..."
              className="pl-11 pr-5 py-3.5 bg-card border border-navy/10 rounded-2xl text-sm text-navy placeholder:text-navy/20 focus:outline-none focus:ring-4 focus:ring-primary/5 w-80 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 bg-card border border-navy/5 rounded-2xl shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] font-black text-navy uppercase tracking-widest">Performance Directe</span>
          </div>
          <button 
            onClick={fetchLeads}
            className="p-3 bg-card border border-navy/5 text-navy/40 hover:text-primary hover:border-primary/20 rounded-2xl transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date RDV Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap px-1">
        <div className="flex items-center gap-2 text-navy/40">
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Filtrer par date RDV :</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {DATE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${
                dateFilter === f.id
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105'
                  : 'bg-card text-navy/50 border-navy/10 hover:border-primary/30 hover:text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {dateFilter === 'custom' && (
          <CustomDatePicker value={customDate} onChange={setCustomDate} />
        )}
        {dateFilter !== 'all' && (
          <span className="text-[10px] font-bold text-primary/60 ml-1">
            {leads.filter(l => {
              if (!getDateRange || !l.date_rdv) return getDateRange ? false : true;
              const d = new Date(l.date_rdv);
              return d >= getDateRange.from && d < getDateRange.to;
            }).length} ticket(s) correspondant(s)
          </span>
        )}
      </div>

      {/* Professional Statistics Dashboard */}
      <PipelineStats leads={leads} getLeadsByStatus={getLeadsByStatus} />

      {/* Pipeline Grid */}
      <div className="flex gap-4 overflow-x-auto pb-8 custom-scrollbar items-start">
        {pipelineColumns.map(column => {
          const columnLeads = getLeadsByStatus(column.id);
          const totalValue = columnLeads.reduce((acc, l) => acc + (parseFloat(l.ca_signe_ht) || 0), 0);

          return (
            <div 
              key={column.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('leadId');
                if (id) updateLeadStatus(id, column.id);
                setDraggedId(null);
              }}
              className="flex-shrink-0 w-[280px] flex flex-col gap-3"
            >
              {/* Column Header */}
              <div className="flex flex-col gap-2 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-navy/80">{column.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-navy/20">{columnLeads.length}</span>
                  </div>
                </div>
                {/* Odoo Color Bar */}
                <div className="h-1 w-full bg-navy/5 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-500" style={{ backgroundColor: column.color, width: columnLeads.length > 0 ? '100%' : '5%' }} />
                </div>
                <div className="flex justify-end">
                  <span className="text-[11px] font-bold text-navy/40">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className={`flex flex-col gap-3 min-h-[500px] transition-all duration-300 rounded-xl ${draggedId ? 'bg-navy/[0.01]' : ''}`}>
                <AnimatePresence mode="popLayout">
                  {columnLeads.map((lead) => (
                    <motion.div
                      key={lead.id}
                      layoutId={lead.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      draggable
                      onDragStart={(e) => {
                        setDraggedId(lead.id);
                        e.dataTransfer.setData('leadId', lead.id);
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      onClick={() => setSelectedLead(lead)}
                      className={`relative bg-card p-4 rounded-xl border border-navy/5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-xl hover:border-primary/20 transition-all ${draggedId === lead.id ? 'opacity-0' : 'opacity-100'}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-navy/20 uppercase tracking-widest leading-none">Opportunité de</span>
                            {lead.client_of && (
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-tighter ${
                                lead.client_of.toLowerCase().includes('ca conseil') ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                lead.client_of.toLowerCase().includes('go conseil') ? 'bg-green-50 text-green-600 border-green-100' :
                                lead.client_of.toLowerCase().includes('hors zone') ? 'bg-pink-50 text-pink-600 border-pink-100' :
                                lead.client_of.toLowerCase().includes('tb formation') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-navy/[0.03] text-navy/40 border-navy/5'
                              }`}>
                                {lead.client_of}
                              </span>
                            )}
                          </div>
                          <h3 className="text-[13px] font-bold text-navy leading-tight truncate">
                            {lead.nom_entreprise || 'N/A'}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-primary">{formatCurrency(lead.ca_signe_ht)}</span>
                          <div className="flex items-center gap-1">
                             <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                             <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                             <Star className="w-2.5 h-2.5 text-navy/10" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-2 py-0.5 rounded bg-navy/5 border border-navy/5">
                            <span className="text-[9px] font-black text-navy/40 uppercase">{lead.status || 'RDV'}</span>
                          </div>
                          {lead.status_rdv && (
                            <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/10">
                              <span className="text-[9px] font-black text-primary uppercase">{lead.status_rdv}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-navy/[0.03]">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-navy/30">
                            <Calendar className="w-3 h-3" />
                            <span>{lead.date_rdv?.substring(5, 10) || '—'}</span>
                          </div>
                          <div className="w-6 h-6 rounded-lg bg-navy/5 flex items-center justify-center text-[10px] font-black text-navy/40">
                            {lead.funebooster?.charAt(0)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Detail View */}
      {selectedLead && (
        <PipelineDetail 
          lead={selectedLead}
          user={user}
          pipelineColumns={pipelineColumns}
          onClose={() => setSelectedLead(null)}
          onUpdateStatus={async (id, status) => {
            await updateLeadStatus(id, status);
            const updatedLead = leads.find(l => l.id === id);
            if (updatedLead) setSelectedLead({ ...updatedLead, ...updatesFromStatus(status) });
          }}
          onUpdateLead={async (id, updates) => {
            await updateLead(id, updates);
            setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}
    </div>
  );
};

// Helper to simulate updates for the UI
function updatesFromStatus(status) {
  switch (status) {
    case 'Nouveau': return { status: 'RDV', status_rdv: status, proposition: null, signe: null, pec: null, suivi_formation: null };
    case 'RAP': return { status: 'RDV', status_rdv: status, proposition: null, signe: null, pec: null, suivi_formation: null };
    case 'Proposition': return { status: 'RDV', status_rdv: status, proposition: 'OUI', signe: null, pec: null, suivi_formation: null };
    case 'Signé': return { status: 'SIGNE', status_rdv: status, signe: 'OUI', pec: null, suivi_formation: null };
    case 'PEC': return { status: 'RDV', status_rdv: status, pec: 'OUI', signe: null, suivi_formation: null };
    case 'Gagné': return { status: 'SIGNE', status_rdv: status, signe: 'OUI', pec: 'OUI', suivi_formation: null };
    case 'ORGANISÉ': return { suivi_formation: 'ORGANISÉE', status_rdv: status };
    default: return {};
  }
}

export default Pipeline;
