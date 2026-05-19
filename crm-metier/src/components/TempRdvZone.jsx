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
  X,
  MessageSquare,
  Copy,
  Send,
  ExternalLink,
  Eye,
  Check
} from 'lucide-react';
import LeadDetailPanel from './LeadDetailPanel';
import nafMapping from '../data/naf_mapping.json';
import secteurMapping from '../data/secteur_mapping.json';

const TempRdvZone = ({ user }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [selectedCommercials, setSelectedCommercials] = useState({});
  const [validatedLead, setValidatedLead] = useState(null);
  const [messageCopied, setMessageCopied] = useState(false);

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
    let targetCommercial = null;
    if (user?.role === 'funebooster') {
      const assigned = user?.permissions?.assigned_commercials || [];
      if (assigned.length === 1) {
        targetCommercial = assigned[0];
      } else if (assigned.length > 1) {
        targetCommercial = selectedCommercials[id];
        if (!targetCommercial) {
          alert('Veuillez sélectionner un commercial pour ce RDV.');
          return;
        }
      }
    }

    setProcessingId(id);
    const updates = { 
      status: 'RDV',
      status_rdv: 'Nouveau',
      date_modification: new Date().toISOString()
    };
    if (targetCommercial) {
      updates.opcosign = targetCommercial;
    }

    const { error } = await supabase
      .from('crm_leads')
      .update(updates)
      .eq('id', id);

    if (!error) {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        setValidatedLead({ ...lead, ...updates });
        
        // WORKFLOW: Delete validated lead from crm_leads_2025
        if (lead.siret) {
          await supabase
            .from('crm_leads_2025')
            .delete()
            .eq('siret', lead.siret);
        }
      }
      setLeads(prev => prev.filter(l => l.id !== id));
    }
    setProcessingId(null);
  };

  const formatDate = (d, t) => {
    if (!d) return '—';
    const datePart = new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    if (!t || t === '-' || t === ':') return datePart;
    const [h, m] = t.split(/[:hH]/);
    const timePart = `${(h || '00').padStart(2, '0')}h${(m || '00').substring(0, 2).padStart(2, '0')}`;
    return `${datePart} à ${timePart}`;
  };

  const generateMessage = (lead) => {
    if (!lead) return "";

    // Logic for calculating total employees based on manager status
    const baseSalaries = parseInt(lead.nb_salaries) || 0;
    let statutGerant = String(lead.statut_gerant || lead.statut_gérant || lead.statutGerant || lead.custom_fields?.statut_gerant || '').toLowerCase();
    if (!statutGerant) {
      const possibleKey = Object.keys(lead).find(k => k.toLowerCase().includes('gerant') || k.toLowerCase().includes('gérant'));
      if (possibleKey) statutGerant = String(lead[possibleKey]).toLowerCase();
    }
    let totalSalaries = baseSalaries;
    if (statutGerant.includes('salari')) {
      if (statutGerant.includes('2') || statutGerant.includes('deux')) {
        totalSalaries += 2;
      } else {
        totalSalaries += 1;
      }
    }

    const client = String(lead.client_of || '').toUpperCase();
    const isCA = client.includes('CA CONSEILS') || client.includes('CA');
    const isGO = client.includes('GO CONSEILS') || client.includes('GO');
    const isTB = client.includes('TB FORMATION') || client.includes('TB');
    if (client === 'HORS ZONE' || !client) return "";
    if (!isCA && !isGO && !isTB) return "";
    let msg = "";
    if (isCA || isGO) {
      msg += `SOURCE : PS ${client}\n`;
      msg += `ID \n`; 
    }
    msg += `RDV TÉLÉPHONIQUE POUR LE ${formatDate(lead.date_rdv, lead.heure_rdv)}\n`;
    msg += `Etablissement: ${lead.nom_entreprise || '—'}\n`;
    msg += `Activité: ${lead.secteur_activite || '—'}\n`;
    msg += `ADRESSE: ${lead.adresse || '—'}\n`;
    msg += `Nom du gérant : ${lead.gerant || '—'}\n`;
    msg += `MAIL : ${lead.email || '—'}\n`;
    msg += `Tél : ${lead.mobile || lead.tel || '—'}\n`;
    msg += `Nbr salariés: ${totalSalaries}\n`;
    msg += `APPRENTIS : ${lead.nb_apprentis || '0'}\n`;
    msg += `Siret : ${lead.siret || '—'}\n`;
    msg += `Opco : ${lead.nom_opco || '—'} IDCC ${lead.idcc || '—'}\n`;
    if (lead.observation) {
      msg += `Observation : ${lead.observation}\n`;
    }
    return msg;
  };

  const handleCopyMessage = (lead) => {
    const msg = generateMessage(lead);
    navigator.clipboard.writeText(msg);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  };

  const handleWhatsApp = (lead) => {
    const msg = generateMessage(lead);
    const phone = (lead.mobile || lead.tel || '').replace(/[^0-9]/g, '');
    if (!phone) return alert("Pas de numéro de téléphone");
    window.open(`https://web.whatsapp.com/send?phone=33${phone.substring(1)}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleGoogleCalendar = (lead) => {
    if (!lead || !lead.date_rdv) return alert("Date de RDV manquante");
    
    const client = String(lead.client_of || '').toUpperCase();
    const prefix = client.includes('TB') ? '[TB]' : '[OPCO]';
    const title = `${prefix} ${lead.nom_entreprise || 'RDV'}`;
    
    // Format date and time for Google URL (YYYYMMDDTHHMMSS)
    const date = lead.date_rdv.replace(/-/g, '');
    let time = (lead.heure_rdv || "10:00").replace(/[:hH]/g, '');
    if (time.length < 4) time = time.padStart(4, '0');
    
    const start = `${date}T${time}00`;
    // Approximate end time (+1h)
    const endHour = (parseInt(time.substring(0, 2)) + 1).toString().padStart(2, '0');
    const end = `${date}T${endHour}${time.substring(2)}00`;
    
    const calendarId = client.includes('TB') 
      ? 'maxime.tanneur@tb-formations.fr' 
      : '93079c8fd22819865b2014cb7b6a9a9bd22f396c25ef25ae2398589b64aa4ab0@group.calendar.google.com';

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(generateMessage(lead))}&location=${encodeURIComponent(lead.adresse || '')}&src=${calendarId}&add=${calendarId}`;
    
    window.open(url, '_blank');
  };

  const handleReject = async (id) => {
    if (!window.confirm("Voulez-vous rejeter ce RDV ? Il sera remis en 'BLOQUÉ ARCHIVE'.")) return;
    
    setProcessingId(id);
    const { error } = await supabase
      .from('crm_leads')
      .update({ 
        status: 'BLOQUÉ ARCHIVE',
        date_modification: new Date().toISOString()
      })
      .eq('id', id);

    if (!error) {
      const lead = leads.find(l => l.id === id);
      if (lead && lead.siret) {
        await supabase
          .from('crm_leads_2025')
          .update({ statut_2026: 'BLOQUÉ ARCHIVE' })
          .eq('siret', lead.siret);
      }
      setLeads(prev => prev.filter(l => l.id !== id));
    }
    setProcessingId(null);
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-navy/10 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.3em]">Chargement de la Zone Tampon...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-card p-8 rounded-[2.5rem] border border-navy/5 shadow-xl shadow-navy/[0.02]">
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
            <h2 className="text-3xl font-black text-navy tracking-tight">Zone Tampon</h2>
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
        <div className="flex flex-col items-center justify-center py-32 bg-card rounded-[3rem] border border-dashed border-navy/10">
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
              className="bg-card rounded-[2.5rem] border border-navy/5 p-6 shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all group flex flex-col gap-6 relative overflow-hidden"
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
                    <div className="w-8 h-8 rounded-xl bg-card flex items-center justify-center shadow-sm">
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
                    <div className="w-8 h-8 rounded-xl bg-card flex items-center justify-center shadow-sm">
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
                    <div className="w-8 h-8 rounded-xl bg-card flex items-center justify-center shadow-sm">
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

              {/* Commercial Selection for Funbooster with multiple assignments */}
              {user?.role === 'funebooster' && (user?.permissions?.assigned_commercials || []).length > 1 && (
                <div className="bg-navy/[0.02] rounded-3xl p-4">
                  <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1 mb-2 block">Assigner au commercial</label>
                  <select 
                    value={selectedCommercials[lead.id] || ''}
                    onChange={(e) => setSelectedCommercials(prev => ({ ...prev, [lead.id]: e.target.value }))}
                    className="w-full bg-card border border-navy/10 rounded-2xl px-4 py-3 text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <option className="bg-card text-navy" value="">Sélectionner un commercial...</option>
                    {(user.permissions.assigned_commercials).map(c => <option className="bg-card text-navy" key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

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
          userRole={user?.role}
          permissions={user?.permissions}
          onUpdate={(id, updates) => {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
          }}
        />
      )}

      {/* Success Modal with Message */}
      {validatedLead && (
        <>
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[200] animate-in fade-in duration-300" onClick={() => setValidatedLead(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-[2.5rem] shadow-2xl z-[201] animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden border border-navy/5">
            <div className="p-8 text-center border-b border-navy/5 bg-navy/[0.01]">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20 animate-bounce">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-navy tracking-tight">RDV Validé !</h3>
              <p className="text-[9px] font-bold text-navy/30 uppercase tracking-[0.3em] mt-1">Dossier transféré avec succès</p>
            </div>

            <div className="p-8 flex-1 overflow-y-auto max-h-[50vh] custom-scrollbar">
              {generateMessage(validatedLead) !== "" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm ring-1 ring-emerald-500/5">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h3 className="text-[11px] font-black text-navy uppercase tracking-widest">Message prêt</h3>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleCopyMessage(validatedLead)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-navy/5 text-navy hover:bg-active hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        {messageCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {messageCopied ? 'Copié' : 'Copier'}
                      </button>
                      <button 
                        onClick={() => handleWhatsApp(validatedLead)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                      <button 
                        onClick={() => handleGoogleCalendar(validatedLead)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white hover:bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Agenda
                      </button>
                    </div>
                  </div>
                  <div className="bg-navy/[0.02] p-6 rounded-3xl border border-navy/5 font-mono text-[10.5px] leading-relaxed text-navy/80 whitespace-pre-wrap select-all selection:bg-primary/20">
                    {generateMessage(validatedLead)}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center opacity-40">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Aucun message pour ce client</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-navy/5 bg-navy/[0.01]">
              <button 
                onClick={() => setValidatedLead(null)}
                className="w-full py-4 bg-active text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-active/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-active/10"
              >
                Fermer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TempRdvZone;
