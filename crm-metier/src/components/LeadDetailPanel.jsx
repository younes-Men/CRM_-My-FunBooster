import React, { useState, useEffect } from 'react';
import { 
  X, Clock, User, Building2, MapPin, Hash, Briefcase, 
  Calendar, MessageSquare, History, Phone, Save, Check,
  ExternalLink, Layers, Send, Copy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import nafMapping from '../data/naf_mapping.json';
import opcoMapping from '../data/opco_mapping.json';
import secteurMapping from '../data/secteur_mapping.json';

const formatNaf = (val) => {
  if (!val) return val;
  const clean = String(val).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === 5) {
    return `${clean.substring(0, 2)}.${clean.substring(2, 4)}${clean.substring(4)}`;
  }
  if (clean.length === 4) {
    const matches = Object.keys(nafMapping).filter(k => k.startsWith(clean));
    if (matches.length === 1) {
      const full = matches[0];
      return `${full.substring(0, 2)}.${full.substring(2, 4)}${full.substring(4)}`;
    }
    return `${clean.substring(0, 2)}.${clean.substring(2)}`;
  }
  return val;
};

const LeadDetailPanel = ({ leadId, lead: initialLead, onClose, userName, permissions, userRole, onUpdate }) => {
  const [lead, setLead] = useState(initialLead);
  const [editValues, setEditValues] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [messageCopied, setMessageCopied] = useState(false);
  const [currentConfigs, setCurrentConfigs] = useState([]);

  useEffect(() => {
    const fetchConfigs = async () => {
      const { data } = await supabase
        .from('crm_column_configs')
        .select('*')
        .order('display_order', { ascending: true });
      if (data) setCurrentConfigs(data);
    };
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (initialLead) setLead(initialLead);
  }, [initialLead]);

  const isAdmin = userRole === 'admin' || (permissions?.leads_columns && permissions.leads_columns.includes('all'));

  const isVisible = (key) => {
    if (!permissions?.leads_columns) return true;
    if (permissions.leads_columns.includes('all')) return true;
    return permissions.leads_columns.includes(key);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditValues({});
    } else {
      // Flatten custom_fields for easier editing
      const flatLead = { ...lead, ...(lead.custom_fields || {}) };
      setEditValues(flatLead);
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  // Helper for automated NAF label
  const getAutomatedLibelle = () => {
    if (lead.libelle_activite) return lead.libelle_activite;
    const nafValue = lead.code_naf || lead.secteur;
    if (nafValue) {
      const cleanNaf = String(nafValue).toUpperCase().replace(/[^A-Z0-9]/g, '');
      let desc = nafMapping[cleanNaf];
      if (!desc && cleanNaf.length === 4) {
        const matches = Object.keys(nafMapping).filter(k => k.startsWith(cleanNaf));
        if (matches.length === 1) desc = nafMapping[matches[0]];
      }
      return desc || null;
    }
    return null;
  };

  useEffect(() => {
    if (leadId) {
      fetchHistory();
      // Auto-enrich if missing critical info
      if (lead?.siret && (!lead.gerant || !lead.idcc)) {
        fetchEnrichmentData(lead.siret);
      }
    }
  }, [leadId]);

  const fetchEnrichmentData = async (siret, debug = false) => {
    try {
      const cleanSiret = String(siret).replace(/[^0-9]/g, '');
      if (cleanSiret.length < 9) return;
      
      const siren = cleanSiret.substring(0, 9);
      
      // Attempt 1: Search by SIRET (to get specific manager/location)
      let response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiret}`);
      let data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const updates = {};
        let foundGerant = "";
        let foundIdcc = "";
        
        // 1. Get Gérant Name
        if (result.dirigeants && result.dirigeants.length > 0) {
          const d = result.dirigeants[0];
          foundGerant = `${d.nom || ''} ${d.prenoms || ''}`.trim().toUpperCase();
          if (!lead.gerant || lead.gerant === '---') updates.gerant = foundGerant;
        }

        // 2. Get IDCC (Searching in all locations found in your JSON)
        const idccList = result.liste_idcc || 
                         (result.complements && result.complements.liste_idcc) ||
                         (result.siege && result.siege.liste_idcc) ||
                         (result.unite_legale && result.unite_legale.liste_idcc) ||
                         (result.matching_etablissements && result.matching_etablissements[0]?.liste_idcc);

        if (idccList && idccList.length > 0) {
          foundIdcc = String(idccList[0]).trim();
        }

        // Attempt 2: If IDCC still missing, search by SIREN
        if (!foundIdcc) {
          const sirenResp = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}`);
          const sirenData = await sirenResp.json();
          if (sirenData.results && sirenData.results.length > 0) {
            const sResult = sirenData.results[0];
            const sIdccList = sResult.liste_idcc || (sResult.unite_legale && sResult.unite_legale.liste_idcc);
            if (sIdccList && sIdccList.length > 0) {
              foundIdcc = String(sIdccList[0]).trim();
            }
          }
        }

        if (foundIdcc && (!lead.idcc || lead.idcc === '' || lead.idcc === '---')) {
          updates.idcc = foundIdcc;
          updates.custom_fields = { ...(lead.custom_fields || {}), idcc: foundIdcc };
        }

        // 3. Match Sector Activity
        let matchedSecteur = "";
        const idccToMatch = foundIdcc || lead.idcc;
        const nafToMatch = lead.code_naf || (result.activite_principale ? String(result.activite_principale).replace(/[^A-Z0-9]/g, '') : "");

        if (idccToMatch && secteurMapping.idcc[idccToMatch]) {
          matchedSecteur = secteurMapping.idcc[idccToMatch];
        } else if (nafToMatch && secteurMapping.naf[nafToMatch]) {
          matchedSecteur = secteurMapping.naf[nafToMatch];
        }

        if (matchedSecteur && (!lead.secteur_activite || lead.secteur_activite === '---')) {
          updates.secteur_activite = matchedSecteur;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('crm_leads')
            .update(updates)
            .eq('id', lead.id);

          if (!updateError) {
            const updatedLead = { ...lead, ...updates };
            setLead(updatedLead);
            if (onUpdate) onUpdate(lead.id, updatedLead);
          }
        }
      }
    } catch (err) {
      console.error('API Enrichment Error:', err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_observations_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (!error) setHistory(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const nativeKeys = [
        'lead_id', 'nom_entreprise', 'funebooster', 'gerant', 'siret', 
        'secteur_activite', 'libelle_activite', 'idcc', 'code_naf', 
        'tel', 'mobile', 'adresse', 'code_postal', 'code_departement', 
        'status', 'status_rdv', 'email', 'site_web', 'statut_gerant', 
        'nb_salaries', 'nb_apprentis', 'client_of', 'opcosign', 
        'budget_opco', 'annee_budget', 'date_rdv', 'heure_rdv', 
        'type_rdv', 'rdv_honore', 'proposition', 'signe', 'date_signe', 
        'ca_signe_ht', 'nb_heures_formation', 'tx_horaire_ca', 
        'campagne_act', 'pec', 'pappers'
      ];

      const nativeUpdates = {};
      const customUpdates = {};

      Object.keys(editValues).forEach(key => {
        if (nativeKeys.includes(key)) {
          nativeUpdates[key] = editValues[key];
        } else {
          customUpdates[key] = editValues[key];
        }
      });

      const finalPayload = {
        ...nativeUpdates,
        custom_fields: { ...(lead.custom_fields || {}), ...customUpdates },
        date_modification: new Date().toISOString()
      };

      const { error } = await supabase
        .from('crm_leads')
        .update(finalPayload)
        .eq('id', lead.id);

      if (error) throw error;

      const updatedLead = { ...lead, ...finalPayload };

      setLead(updatedLead);
      setIsEditing(false);
      if (onUpdate) onUpdate(lead.id, updatedLead);
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde');
    }
    setLoading(false);
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

  const generateMessage = () => {
    if (!lead) return "";
    const client = String(lead.client_of || '').toUpperCase();
    
    // Flexible matching
    const isCA = client.includes('CA CONSEILS') || client.includes('CA');
    const isGO = client.includes('GO CONSEILS') || client.includes('GO');
    const isTB = client.includes('TB FORMATION') || client.includes('TB');
    
    // If HORS ZONE or empty, don't show
    if (client === 'HORS ZONE' || !client) return "";
    if (!isCA && !isGO && !isTB) return "";

    let msg = "";
    if (isCA || isGO) {
      msg += `SOURCE : PS ${client}\n`;
      msg += `ID \n`; // Left empty for manual entry
    }
    
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
    
    // Add observation from history or fallback to lead.observation
    const observation = history.length > 0 ? history[0].observation_text : (lead.observation || "");
    if (observation) {
      msg += `Observation : ${observation}\n`;
    }

    return msg;
  };

  const handleCopyMessage = () => {
    const msg = generateMessage();
    navigator.clipboard.writeText(msg);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = generateMessage();
    const phone = (lead.mobile || lead.tel || '').replace(/[^0-9]/g, '');
    if (!phone) return alert("Pas de numéro de téléphone");
    window.open(`https://web.whatsapp.com/send?phone=33${phone.substring(1)}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!lead) return null;

  // Filter custom column configs
  const nativeKeys = [
    'lead_id', 'funebooster', 'nom_entreprise', 'gerant', 'siret', 
    'secteur_activite', 'libelle_activite', 'nom_opco', 'idcc', 
    'code_naf', 'tel', 'mobile', 'adresse', 'code_postal', 
    'code_departement', 'status', 'status_rdv', 'email', 'site_web', 
    'statut_gerant', 'nb_salaries', 'nb_apprentis', 'date_modification', 
    'client_of', 'opcosign', 'budget_opco', 'annee_budget', 'date_rdv', 
    'heure_rdv', 'type_rdv', 'rdv_honore', 'proposition', 'signe', 
    'date_signe', 'ca_signe_ht', 'nb_heures_formation', 'tx_horaire_ca', 
    'campagne_act', 'pec', 'pappers'
  ];
  const customColumnConfigs = currentConfigs.filter(c => !nativeKeys.includes(c.key) && c.is_visible);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100] animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full max-w-xl bg-card shadow-2xl z-[101] animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden border-l border-navy/5 transform-gpu">
        
        {/* Header */}
        <div className="p-8 border-b border-navy/5 flex items-center justify-between bg-card sticky top-0 z-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-navy tracking-tight font-outfit uppercase">Détails du Lead</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em]">ID: {lead.id}</span>
              <div className="w-1 h-1 rounded-full bg-navy/10" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Dossier Complet</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={isEditing ? handleSave : handleEditToggle}
                className={`p-3 rounded-2xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest ${isEditing ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-navy/5 text-navy hover:bg-navy hover:text-white'}`}
              >
                {isEditing ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isEditing ? 'Enregistrer' : 'Modifier'}
              </button>
            )}
            {isEditing && (
              <button onClick={handleEditToggle} className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest">
                <X className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-3 rounded-2xl bg-navy/5 text-navy/40 hover:bg-navy hover:text-white transition-all group">
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 overscroll-contain">
          <div className="space-y-10">
            
            {/* Info Section: Company */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/5">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">Informations Entreprise</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-navy/[0.02] p-6 rounded-3xl border border-navy/5">
                {isVisible('nom_entreprise') && <InfoItem label="Raison Sociale" value={isEditing ? editValues.nom_entreprise : lead.nom_entreprise} icon={Building2} isEditing={isEditing} name="nom_entreprise" onChange={handleInputChange} />}
                {isVisible('siret') && <InfoItem label="N° SIRET" value={isEditing ? editValues.siret : lead.siret} icon={Hash} isMono isEditing={isEditing} name="siret" onChange={handleInputChange} />}
                {isVisible('secteur_activite') && <InfoItem label="Secteur" value={isEditing ? editValues.secteur_activite : lead.secteur_activite} icon={Briefcase} isEditing={isEditing} name="secteur_activite" onChange={handleInputChange} />}
                {isVisible('libelle_activite') && <InfoItem label="Libellé" value={isEditing ? editValues.libelle_activite : getAutomatedLibelle()} isEditing={isEditing} name="libelle_activite" onChange={handleInputChange} />}
                {isVisible('nom_opco') && <InfoItem label="Opco" value={isEditing ? editValues.nom_opco : lead.nom_opco} isEditing={isEditing} name="nom_opco" onChange={handleInputChange} />}
                {isVisible('code_naf') && <InfoItem label="NAF" value={isEditing ? editValues.code_naf : (lead.code_naf || lead.secteur)} isMono isEditing={isEditing} name="code_naf" onChange={handleInputChange} />}
                {isVisible('gerant') && <InfoItem label="Gérant" value={isEditing ? editValues.gerant : lead.gerant} icon={User} isEditing={isEditing} name="gerant" onChange={handleInputChange} />}
                {isVisible('idcc') && <InfoItem label="IDCC" value={isEditing ? editValues.idcc : lead.idcc} icon={Hash} isEditing={isEditing} name="idcc" onChange={handleInputChange} />}
              </div>
            </section>

            {/* Section: Custom Fields */}
            {customColumnConfigs.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 shadow-sm ring-1 ring-purple-500/5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest">Champs Personnalisés</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-500/[0.02] p-6 rounded-3xl border border-purple-500/5">
                  {customColumnConfigs.map(col => (
                    <InfoItem 
                      key={col.key}
                      label={col.label} 
                      value={isEditing ? editValues[col.key] : lead.custom_fields?.[col.key]} 
                      isEditing={isEditing}
                      name={col.key}
                      type={col.type === 'number' ? 'number' : col.type === 'date_picker' ? 'date' : 'text'}
                      onChange={handleInputChange}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Info Section: Contact & Location */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-navy/5 text-navy shadow-sm ring-1 ring-navy/5">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">Contact & Localisation</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 bg-navy/[0.02] p-6 rounded-3xl border border-navy/5 text-sm">
                {isVisible('adresse') && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">Adresse Complète</span>
                    {isEditing ? <input type="text" value={editValues.adresse || ''} onChange={(e) => handleInputChange('adresse', e.target.value)} className="bg-card border border-navy/10 rounded-lg px-3 py-2 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 w-full" /> : <p className="text-navy font-bold">{lead.adresse || '—'}</p>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-navy/5">
                  {isVisible('code_postal') && <InfoItem label="Code Postal" value={isEditing ? editValues.code_postal : lead.code_postal} isEditing={isEditing} name="code_postal" onChange={handleInputChange} />}
                  {isVisible('code_departement') && <InfoItem label="Département" value={isEditing ? editValues.code_departement : lead.code_departement} isEditing={isEditing} name="code_departement" onChange={handleInputChange} />}
                  {(isVisible('tel') || isVisible('mobile')) && <div className="col-span-full h-px bg-navy/5 my-2" />}
                  {isVisible('tel') && <InfoItem label="Téléphone Fixe" value={isEditing ? editValues.tel : lead.tel} icon={Phone} isEditing={isEditing} name="tel" onChange={handleInputChange} />}
                  {isVisible('mobile') && <InfoItem label="Mobile" value={isEditing ? editValues.mobile : lead.mobile} icon={Phone} isEditing={isEditing} name="mobile" onChange={handleInputChange} />}
                </div>
              </div>
            </section>

            {/* Info Section: Status & Dates */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600 shadow-sm ring-1 ring-green-500/5">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">État du Dossier</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-navy/[0.02] p-6 rounded-3xl border border-navy/5">
                {isVisible('status') && <InfoItem label="Statut Actuel" value={isEditing ? editValues.status : lead.status} isEditing={isEditing} name="status" onChange={handleInputChange} />}
                {isVisible('status_rdv') && <InfoItem label="Statut RDV" value={isEditing ? editValues.status_rdv : lead.status_rdv} isEditing={isEditing} name="status_rdv" onChange={handleInputChange} />}
                {isVisible('funebooster') && <InfoItem label="FUNEBOOSTER" value={isEditing ? editValues.funebooster : lead.funebooster} icon={User} isEditing={isEditing} name="funebooster" onChange={handleInputChange} />}
                {isVisible('date_rdv') && <InfoItem label="Date RDV" value={isEditing ? editValues.date_rdv : formatDate(lead.date_rdv, lead.heure_rdv)} isEditing={isEditing} name="date_rdv" type="date" onChange={handleInputChange} />}
                {isVisible('type_rdv') && <InfoItem label="Type RDV" value={isEditing ? editValues.type_rdv : lead.type_rdv} isEditing={isEditing} name="type_rdv" onChange={handleInputChange} />}
              </div>
            </section>

            {/* History Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-active text-white shadow-lg ring-1 ring-active/20">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest">Historique</h3>
                </div>
              </div>
              <div className="space-y-4">
                {loading ? <div className="p-6 animate-pulse bg-navy/[0.02] rounded-3xl border border-navy/5 text-[10px] font-bold uppercase tracking-widest">Chargement...</div> : history.length === 0 ? <div className="p-12 bg-navy/[0.02] rounded-3xl border border-dashed border-navy/10 text-center text-[10px] font-bold text-navy/40 uppercase tracking-widest">Aucun historique</div> : (
                  <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-navy/[0.04]">
                    {history.map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-white ring-4 ring-navy/[0.04] shadow-sm" />
                        <div className="p-5 bg-card border border-navy/5 rounded-2xl shadow-sm">
                          <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black text-navy uppercase tracking-widest">{item.created_by}</span><span className="text-[9px] font-bold text-navy/30 uppercase">{formatDate(item.created_at)}</span></div>
                          <p className="text-sm text-navy/80 font-medium">{item.observation_text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Message Preview Section */}
            {generateMessage() !== "" && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm ring-1 ring-emerald-500/5">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-navy uppercase tracking-widest">Aperçu du Message</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCopyMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-navy/5 text-navy hover:bg-navy hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      {messageCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {messageCopied ? 'Copié !' : 'Copier'}
                    </button>
                    <button 
                      onClick={handleWhatsApp}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>
                <div className="bg-navy/[0.03] p-8 rounded-[2.5rem] border border-navy/5 font-mono text-[11px] leading-relaxed text-navy/80 whitespace-pre-wrap select-all selection:bg-primary/20">
                  {generateMessage()}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-navy/5 bg-navy/[0.01]">
          <button onClick={onClose} className="w-full py-4 bg-active text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-active/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-active/20">Fermer le Panel</button>
        </div>
      </div>
    </>
  );
};

const InfoItem = ({ label, value, icon: Icon, isMono, isEditing, onChange, name, type = 'text' }) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-navy/20" />}
      <span className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">{label}</span>
    </div>
    {isEditing ? <input type={type} name={name} value={value || ''} onChange={(e) => onChange(name, e.target.value)} className="bg-card border border-navy/10 rounded-lg px-2 py-1.5 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 w-full" /> : <span className={`text-navy font-bold break-words leading-snug ${isMono ? 'font-mono tracking-tighter text-sm' : 'text-[13px]'}`}>{value || '—'}</span>}
  </div>
);

export default LeadDetailPanel;
