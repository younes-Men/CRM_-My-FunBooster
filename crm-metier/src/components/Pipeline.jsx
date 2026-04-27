import React, { useState, useEffect, useCallback } from 'react';
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
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PipelineDetail from './PipelineDetail';

const PIPELINE_COLUMNS = [
  { id: 'Nouveau', label: 'Nouveau', color: '#6d28d9' }, // Purple
  { id: 'RAP', label: 'RAP', color: '#94a3b8' }, // Grey
  { id: 'Proposition', label: 'Proposition', color: '#ef4444' }, // Red
  { id: 'Signé', label: 'Signé', color: '#3b82f6' }, // Blue
  { id: 'PEC', label: 'PEC', color: '#1e293b' }, // Dark
  { id: 'Gagné', label: 'Gagné', color: '#22c55e' }, // Green
  { id: 'ORGANISÉ', label: 'ORGANISÉ', color: '#06b6d4' }, // Cyan
];

const Pipeline = ({ user }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    
    let query = supabase.from('crm_leads').select('*');
    if (user.role === 'commercial' && user.client) {
      query = query.eq('client_of', user.client);
    }

    const { data, error } = await query.order('date_modification', { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLeads();
    const channel = supabase.channel('pipeline_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => fetchLeads()).subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchLeads]);

  const updateLeadStatus = async (id, newStatus) => {
    if (!supabase) return;
    // Reset logic to ensure tickets move correctly between columns
    let updates = { 
      date_modification: new Date().toISOString(),
      status_rdv: newStatus
    };

    switch (newStatus) {
      case 'Nouveau':
        updates.status = 'RDV';
        updates.proposition = null;
        updates.signe = null;
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'RAP':
        updates.status = 'RAPPEL';
        updates.proposition = null;
        updates.signe = null;
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'Proposition':
        updates.status = 'RDV';
        updates.proposition = 'OUI';
        updates.signe = null;
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'Signé':
        updates.status = 'SIGNE';
        updates.signe = 'OUI';
        updates.pec = null;
        updates.suivi_formation = null;
        break;
      case 'PEC':
        updates.status = 'RDV';
        updates.pec = 'OUI';
        updates.signe = null;
        updates.suivi_formation = null;
        break;
      case 'Gagné':
        updates.status = 'SIGNE';
        updates.signe = 'OUI';
        updates.pec = 'OUI';
        updates.suivi_formation = null;
        break;
      case 'ORGANISÉ':
        updates.suivi_formation = 'ORGANISÉE';
        break;
      default:
        break;
    }
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateLead = async (id, updates) => {
    if (!supabase) return;
    const { error } = await supabase.from('crm_leads').update({
      ...updates,
      date_modification: new Date().toISOString()
    }).eq('id', id);
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, date_modification: new Date().toISOString() } : l));
  };

  const getLeadsByStatus = (status) => {
    return leads.filter(l => {
      const matchesSearch = !searchQuery || l.nom_entreprise?.toLowerCase().includes(searchQuery.toLowerCase()) || l.siret?.includes(searchQuery);
      if (!matchesSearch) return false;
      switch (status) {
        case 'Nouveau': return l.status === 'RDV';
        case 'RAP': return l.status === 'RAPPEL';
        case 'Proposition': return l.proposition === 'OUI' && l.status !== 'SIGNE';
        case 'Signé': return l.status === 'SIGNE' && l.pec !== 'OUI';
        case 'PEC': return l.pec === 'OUI' && l.status !== 'SIGNE';
        case 'Gagné': return l.status === 'SIGNE' && l.pec === 'OUI';
        case 'ORGANISÉ': return l.suivi_formation === 'ORGANISÉE';
        default: return false;
      }
    });
  };

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

  return (
    <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-700">
      {/* Search & Actions - Light Mode */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4 px-1">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-navy leading-none mb-1">Pipeline</span>
            <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em]">{user.client || 'Général'}</span>
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
              className="pl-11 pr-5 py-3.5 bg-white border border-navy/10 rounded-2xl text-sm text-navy placeholder:text-navy/20 focus:outline-none focus:ring-4 focus:ring-primary/5 w-80 transition-all shadow-sm"
            />
          </div>
          <button onClick={fetchLeads} className="p-3.5 rounded-2xl bg-white border border-navy/10 text-navy hover:text-primary hover:border-primary transition-all shadow-sm active:scale-95">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kanban Board - Light Mode */}
      <div className="flex gap-4 overflow-x-auto pb-8 custom-scrollbar items-start">
        {PIPELINE_COLUMNS.map(column => {
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
                      className={`relative bg-white p-4 rounded-xl border border-navy/5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-xl hover:border-primary/20 transition-all ${draggedId === lead.id ? 'opacity-0' : 'opacity-100'}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-navy/20 uppercase tracking-widest leading-none">Opportunité de</span>
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
    case 'RAP': return { status: 'RAPPEL', status_rdv: status, proposition: null, signe: null, pec: null, suivi_formation: null };
    case 'Proposition': return { status: 'RDV', status_rdv: status, proposition: 'OUI', signe: null, pec: null, suivi_formation: null };
    case 'Signé': return { status: 'SIGNE', status_rdv: status, signe: 'OUI', pec: null, suivi_formation: null };
    case 'PEC': return { status: 'RDV', status_rdv: status, pec: 'OUI', signe: null, suivi_formation: null };
    case 'Gagné': return { status: 'SIGNE', status_rdv: status, signe: 'OUI', pec: 'OUI', suivi_formation: null };
    case 'ORGANISÉ': return { suivi_formation: 'ORGANISÉE', status_rdv: status };
    default: return {};
  }
}

export default Pipeline;
