import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
  X
} from 'lucide-react';
import LeadDetailPanel from './LeadDetailPanel';

const TempRdvZone = ({ user }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingRdvs();
    
    // Realtime subscription for Zone Temp
    const channel = supabase
      .channel('temp_rdv_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'crm_leads'
      }, () => fetchPendingRdvs())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPendingRdvs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('status', 'EN ATTENTE RDV')
      .order('date_modification', { ascending: false });

    if (!error && data) setLeads(data);
    setLoading(false);
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    const { error } = await supabase
      .from('crm_leads')
      .update({ 
        status: 'RDV',
        date_modification: new Date().toISOString()
      })
      .eq('id', id);

    if (!error) {
      setLeads(prev => prev.filter(l => l.id !== id));
    }
    setProcessingId(null);
  };

  const handleReject = async (id) => {
    if (!window.confirm("Voulez-vous rejeter ce RDV ? Il sera remis 'À TRAITER'.")) return;
    
    setProcessingId(id);
    const { error } = await supabase
      .from('crm_leads')
      .update({ 
        status: 'A TRAITER',
        date_modification: new Date().toISOString()
      })
      .eq('id', id);

    if (!error) {
      setLeads(prev => prev.filter(l => l.id !== id));
    }
    setProcessingId(null);
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-navy/10 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.3em]">Chargement de la Zone Temp...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-navy/5 shadow-xl shadow-navy/[0.02]">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center relative">
            <Bell className="w-8 h-8 text-orange-500" />
            {leads.length > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white animate-bounce">
                {leads.length}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-3xl font-black text-navy tracking-tight">Zone Temp</h2>
            <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em] mt-1">Validation des nouveaux rendez-vous</p>
          </div>
        </div>
        
        <button 
          onClick={fetchPendingRdvs}
          className="p-4 rounded-2xl bg-navy/5 text-navy hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-navy/10">
          <div className="w-20 h-20 rounded-full bg-navy/5 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-navy/10" />
          </div>
          <h3 className="text-lg font-bold text-navy/40 uppercase tracking-widest">Tout est à jour</h3>
          <p className="text-sm text-navy/20 mt-2 text-center">Aucun rendez-vous en attente de validation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div 
              key={lead.id}
              className="bg-white rounded-[2.5rem] border border-navy/5 p-6 shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all group flex flex-col gap-6 relative overflow-hidden"
            >
              {/* Top Section */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">En attente d'accord</span>
                  <h3 className="text-xl font-black text-navy leading-tight truncate group-hover:text-primary transition-colors">
                    {lead.nom_entreprise || 'Sans Nom'}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-navy/20" />
                </div>
              </div>

              {/* RDV Info Card */}
              <div className="bg-navy/[0.02] rounded-3xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-navy/30 uppercase leading-none">Date RDV</span>
                      <span className="text-xs font-black text-navy">
                        {lead.date_rdv ? new Date(lead.date_rdv).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Non définie'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-navy/30 uppercase leading-none">Heure</span>
                      <span className="text-xs font-black text-navy">{lead.heure_rdv || '--h--'}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-navy/5" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <User className="w-4 h-4 text-navy/40" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-navy/30 uppercase leading-none">Funbooster</span>
                      <span className="text-xs font-black text-navy">{lead.funebooster || 'Inconnu'}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-navy/5 border border-navy/5">
                    <span className="text-[10px] font-black text-navy/40 uppercase">{lead.client_of || 'Général'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setSelectedLeadId(lead.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-navy/5 text-navy hover:bg-navy/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Détails
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReject(lead.id)}
                    disabled={processingId === lead.id}
                    className="w-12 h-12 flex items-center justify-center bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleApprove(lead.id)}
                    disabled={processingId === lead.id}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
                  >
                    {processingId === lead.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Donner l'accord
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLeadId && (
        <LeadDetailPanel 
          leadId={selectedLeadId}
          lead={leads.find(l => l.id === selectedLeadId)}
          onClose={() => setSelectedLeadId(null)}
          userName={user?.name}
        />
      )}
    </div>
  );
};

export default TempRdvZone;
