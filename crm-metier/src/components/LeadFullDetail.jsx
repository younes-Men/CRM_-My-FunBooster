import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Clock, User, Building2, MapPin, Hash, Briefcase, 
  Calendar, MessageSquare, History, Phone, Save, Check,
  ExternalLink, Layers, Send, Copy, ArrowLeft, ArrowRight,
  ChevronLeft, ChevronRight, Pencil, Mail, Trash2, Sparkles,
  Smartphone, ChevronDown, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { teamService } from '../lib/teamService';
import nafMapping from '../data/naf_mapping.json';
import opcoMapping from '../data/opco_mapping.json';
import secteurMapping from '../data/secteur_mapping.json';
import StatusConfigModal from './StatusConfigModal';

const slugify = (text) => {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

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

const LeadFullDetail = ({ leadId, leads = [], columns = [], onClose, user, permissions, onUpdate, onLeadChange, isDarkMode, tableName = 'crm_leads', activeTab = '' }) => {
  const nativeKeys = [
    'lead_id', 'funebooster', 'nom_entreprise', 'gerant', 'siret', 
    'secteur_activite', 'libelle_activite', 'nom_opco', 'idcc', 
    'code_naf', 'tel', 'mobile', 'adresse', 'code_postal', 
    'code_departement', 'status', 'status_rdv', 'email', 'site_web', 
    'statut_gerant', 'nb_salaries', 'nb_apprentis', 'date_modification', 
    'client_of', 'opcosign', 'budget_opco', 'annee_budget', 'date_rdv', 
    'heure_rdv', 'type_rdv', 'rdv_honore', 'proposition', 'signe', 
    'date_signe', 'ca_signe_ht', 'nb_heures_formation', 'tx_horaire_ca', 
    'campagne_act', 'pec', 'pappers', 'observation'
  ];

  const [currentLeadId, setCurrentLeadId] = useState(leadId);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [currentConfigs, setCurrentConfigs] = useState([]);
  const [messageCopied, setMessageCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [statusModalConfig, setStatusModalConfig] = useState(null);
  // Find current lead and navigation leads
  const currentIndex = useMemo(() => leads.findIndex(l => l.id === currentLeadId), [leads, currentLeadId]);
  const lead = useMemo(() => leads[currentIndex] || {}, [leads, currentIndex]);
  const prevLead = leads[currentIndex - 1];
  const nextLead = leads[currentIndex + 1];

  const [localComment, setLocalComment] = useState(lead?.observation || '');
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: configs } = await supabase
        .from('crm_column_configs')
        .select('*')
        .order('display_order', { ascending: true });
      if (configs) setCurrentConfigs(configs);

      try {
        const members = await teamService.getAllMembers();
        setTeamMembers(members || []);
        const allClients = await teamService.getAllClients();
        setClients(allClients || []);
      } catch (err) {
        console.error('Error fetching team/clients:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (currentLeadId) {
      fetchHistory();
      if (onLeadChange) onLeadChange(currentLeadId);
      // Only set localComment when lead ID changes, not when content updates in parent
      setLocalComment(leads.find(l => l.id === currentLeadId)?.observation || '');
    }
  }, [currentLeadId, onLeadChange]); // Removed lead?.observation from dependencies

  const fetchHistory = async () => {
    if (tableName !== 'crm_leads') {
      setHistory([]);
      return;
    }
    const { data, error } = await supabase
      .from('crm_observations_history')
      .select('*')
      .eq('lead_id', currentLeadId)
      .order('created_at', { ascending: false });
    if (!error) setHistory(data || []);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    if (tableName !== 'crm_leads') {
      const newObs = lead.observation ? `${lead.observation}\n\n[${user?.name || 'Système'}]: ${newNote}` : `[${user?.name || 'Système'}]: ${newNote}`;
      handleAutoSave('observation', newObs);
      setNewNote('');
      return;
    }

    let activeId = currentLeadId;

    if (lead.isVirtual) {
      try {
        const { id: tempId, isVirtual: _, ...cleanLead } = lead;
        const insertData = {
          ...cleanLead,
          funebooster: cleanLead.funebooster || user?.name || 'Inconnu',
          date_modification: new Date().toISOString()
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('crm_leads')
          .insert([insertData])
          .select();

        if (insertError) throw insertError;

        if (insertedData && insertedData.length > 0) {
          const newRealLead = insertedData[0];
          activeId = newRealLead.id;
          setCurrentLeadId(newRealLead.id);
          if (onUpdate) onUpdate(tempId, newRealLead);

          // Mémoriser l'ID pour le retrouver après actualisation même si filtres actifs l'excluent
          try {
            const recentKey = `crm_api_materialized_${activeTab}`;
            const storedIds = JSON.parse(localStorage.getItem(recentKey) || '[]');
            if (!storedIds.includes(newRealLead.id)) {
              storedIds.push(newRealLead.id);
              localStorage.setItem(recentKey, JSON.stringify(storedIds));
            }
          } catch (e) { console.warn('Erreur stockage ID lead API (note):', e); }
        }
      } catch (err) {
        console.error("Erreur de matérialisation lors de l'ajout de note:", err);
        alert("Impossible d'ajouter la note : erreur d'enregistrement du lead.");
        return;
      }
    }

    const { error } = await supabase.from('crm_observations_history').insert([{
      lead_id: activeId,
      observation_text: newNote,
      created_by: user?.name || user?.email || 'Système'
    }]);
    if (!error) {
      setNewNote('');
      fetchHistory();
    }
  };

  const handleAutoSave = async (field, value) => {
    if (isLocked) {
      alert("Cette fiche est verrouillée (BLOQUÉ ARCHIVE). Seul un administrateur peut y apporter des modifications.");
      return;
    }
    setLoading(true);
    try {
      const isCustom = !nativeKeys.includes(field);
      let finalValue = value;

      // WORKFLOW: Funbooster ne peut pas mettre directement "RDV" — passe par "EN ATTENTE RDV"
      if (field === 'statut_2026' && (value === 'RDV' || value === 'EN ATTENTE RDV')) {
        finalValue = 'EN ATTENTE RDV';
      }
      // Même protection pour crm_leads (status) — non-admins → EN ATTENTE RDV
      if (field === 'status' && value === 'RDV' && user?.role !== 'admin') {
        finalValue = 'EN ATTENTE RDV';
      }

      const updates = isCustom 
        ? { custom_fields: { ...(lead.custom_fields || {}), [field]: finalValue } }
        : { [field]: finalValue };
      
      updates.date_modification = new Date().toISOString();

      // WORKFLOW: If field is statut_2026 and value is RDV/EN ATTENTE RDV
      if (tableName === 'crm_leads_2025' && field === 'statut_2026' && (value === 'RDV' || value === 'EN ATTENTE RDV')) {
        const cleanSiret = String(lead.siret || '').replace(/\s+/g, '');
        if (cleanSiret) {
          const { data: existingLead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('siret', lead.siret)
            .maybeSingle();

          if (existingLead) {
            await supabase
              .from('crm_leads')
              .update({
                status: 'EN ATTENTE RDV',
                date_modification: new Date().toISOString()
              })
              .eq('id', existingLead.id);
          } else {
            await supabase
              .from('crm_leads')
              .insert([{
                nom_entreprise: lead.nom_entreprise,
                siret: lead.siret,
                tel: lead.tel,
                mobile: lead.mobile,
                nom_opco: lead.nom_opco,
                client_of: lead.client_of,
                gerant: lead.gerant,
                code_naf: lead.code_naf,
                libelle_activite: lead.libelle_activite,
                adresse: lead.adresse,
                code_postal: lead.code_postal,
                code_departement: lead.code_departement,
                statut_gerant: lead.statut_gerant,
                nb_salaries: lead.nb_salaries,
                nb_apprentis: lead.nb_apprentis,
                annee_budget: lead.annee_act,
                status: 'EN ATTENTE RDV',
                funebooster: lead.funebooster || user?.name || 'Système',
                date_modification: new Date().toISOString()
              }]);
          }
          alert("Le RDV a été envoyé à la Zone Tampon pour validation !");
        }
      }

      if (lead.isVirtual) {
        const { id: tempId, isVirtual: _, ...cleanLead } = lead;
        const insertData = {
          ...cleanLead,
          ...updates,
          funebooster: cleanLead.funebooster || user?.name || 'Inconnu'
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('crm_leads')
          .insert([insertData])
          .select();

        if (insertError) throw insertError;

        if (insertedData && insertedData.length > 0) {
          const newRealLead = insertedData[0];
          setCurrentLeadId(newRealLead.id);
          
          if (onUpdate) onUpdate(tempId, newRealLead);

          // Mémoriser l'ID pour le retrouver après actualisation même si filtres actifs l'excluent
          try {
            const recentKey = `crm_api_materialized_${activeTab}`;
            const storedIds = JSON.parse(localStorage.getItem(recentKey) || '[]');
            if (!storedIds.includes(newRealLead.id)) {
              storedIds.push(newRealLead.id);
              localStorage.setItem(recentKey, JSON.stringify(storedIds));
            }
          } catch (e) { console.warn('Erreur stockage ID lead API (autosave):', e); }

          if (field === 'observation' && value) {
            await supabase.from('crm_observations_history').insert([{
              lead_id: newRealLead.id,
              observation_text: value,
              created_by: user?.name || user?.email || 'Système'
            }]);
            fetchHistory();
          }
        }
      } else {
        const { error } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', lead.id);

        if (error) throw error;

        // Also insert into history if it's an observation/comment
        if (field === 'observation' && value) {
          if (tableName === 'crm_leads') {
            await supabase.from('crm_observations_history').insert([{
              lead_id: lead.id,
              observation_text: value,
              created_by: user?.name || user?.email || 'Système'
            }]);
            fetchHistory();
          }
        }

        if (onUpdate) onUpdate(lead.id, { ...lead, ...updates });
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
    setLoading(false);
  };

  const isVisible = (key) => {
    if (!permissions?.leads_columns) return true;
    if (permissions.leads_columns.includes('all')) return true;
    return permissions.leads_columns.includes(key);
  };

  const getLeadValue = (key) => {
    if (key === 'pappers') {
      const slug = slugify(lead?.nom_entreprise || '');
      const siren = (lead?.siret || '').substring(0, 9);
      return `https://www.pappers.fr/entreprise/${slug}-${siren}`;
    }
    
    let val = lead[key];
    // Check both root and custom_fields, and handle empty strings/placeholder
    if (val === undefined || val === null || val === '' || val === '---' || val === '-') {
      if (lead.custom_fields && lead.custom_fields[key]) {
        val = lead.custom_fields[key];
      }
    }

    if (key === 'date_modification' && val) {
      try {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}
    }

    return val;
  };

  const formatDateFr = (d) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return d; }
  };

  const generateMessage = () => {
    if (!lead) return "";
    const clientValue = getLeadValue('client_of');
    const client = String(clientValue || '').toUpperCase();
    const isCA = client.includes('CA CONSEILS') || client.includes('CA');
    const isGO = client.includes('GO CONSEILS') || client.includes('GO');
    const isTB = client.includes('TB FORMATION') || client.includes('TB');
    if (client === 'HORS ZONE' || !client) return "";
    if (!isCA && !isGO && !isTB) return "";

    // Logic for calculating total employees based on manager status
    const baseSalariesValue = getLeadValue('nb_salaries');
    const baseSalaries = parseInt(baseSalariesValue) || 0;
    let statutGerant = String(getLeadValue('statut_gerant') || '').toLowerCase();
    
    if (!statutGerant) {
      // Robust search if native field is empty
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

    let msg = "";
    if (isCA || isGO) msg += `SOURCE : PS ${client}\nID \n`;
    msg += `RDV TÉLÉPHONIQUE POUR LE ${formatDateFr(getLeadValue('date_rdv'))}\n`;
    msg += `Etablissement: ${getLeadValue('nom_entreprise') || '—'}\n`;
    msg += `Activité: ${getLeadValue('secteur_activite') || '—'}\n`;
    msg += `ADRESSE: ${getLeadValue('adresse') || '—'}\n`;
    msg += `Nom du gérant : ${getLeadValue('gerant') || '—'}\n`;
    msg += `MAIL : ${getLeadValue('email') || '—'}\n`;
    msg += `Tél : ${getLeadValue('mobile') || getLeadValue('tel') || '—'}\n`;
    msg += `Nbr salariés: ${totalSalaries}\n`;
    msg += `APPRENTIS : ${getLeadValue('nb_apprentis') || '0'}\n`;
    msg += `Siret : ${getLeadValue('siret') || '—'}\n`;
    msg += `Opco : ${getLeadValue('nom_opco') || '—'} IDCC ${getLeadValue('idcc') || '—'}\n`;
    const observation = history.length > 0 ? history[0].observation_text : (getLeadValue('observation') || "");
    if (observation) msg += `Observation : ${observation}\n`;
    return msg;
  };

  const getOptions = (key) => {
    // Priority 1: Use the exact same options as the main table rows
    const tableCol = columns.find(c => c.key === key);
    if (tableCol?.options && tableCol.options.length > 0) return tableCol.options;

    // Priority 2: Fallback to direct DB config
    const config = currentConfigs.find(c => c.key === key);
    if (config?.options && config.options.length > 0) return config.options;
    
    // Legacy fallback for Opcosign if not in columns
    if (key === 'opcosign') {
      const commercials = teamMembers.filter(m => (m.role || '').toLowerCase() === 'commercial');
      if (user?.permissions?.assigned_commercials?.length > 0) {
        return commercials
          .filter(m => user.permissions.assigned_commercials.includes(m.name))
          .map(m => m.name);
      }
      return commercials.map(m => m.name);
    }
    
    return null;
  };

  const isLocked = useMemo(() => {
    if (!lead || !user) return false;
    const userRole = String(user.role || '').toLowerCase().trim();
    const isAdmin = userRole === 'admin';
    
    const status = String(lead.status || '').toUpperCase().trim();
    if (status === 'BLOQUÉ ARCHIVE' && !isAdmin) return true;

    const isCommercial = userRole === 'commercial';
    if (isAdmin || isCommercial) return false;

    const lockedStatuses = ['RDV', 'SIGNE', 'EN ATTENTE RDV'];
    return lockedStatuses.includes(status);
  }, [lead, user]);

  // Grouping logic for dynamic columns
  const allowedConfigs = useMemo(() => {
    return currentConfigs.filter(c => isVisible(c.key) && c.is_visible !== false).map(c => {
      const baseCol = columns.find(oc => oc.key === c.key);
      return {
        ...c,
        label: baseCol?.label || c.label
      };
    });
  }, [currentConfigs, permissions, columns]);

  const readOnlyKeys = ['nom_entreprise', 'siret', 'adresse', 'code_postal', 'code_departement', 'code_naf', 'libelle_activite', 'pappers'];

  const groups = useMemo(() => {
    const enterpriseKeys = ['nom_entreprise', 'gerant', 'siret', 'code_naf', 'libelle_activite', 'secteur_activite', 'nom_opco', 'idcc', 'adresse', 'code_postal', 'code_departement', 'site_web', 'statut_gerant', 'nb_salaries', 'nb_apprentis', 'pappers'];
    const contactKeys = ['email', 'tel', 'mobile'];
    const commercialKeys = ['funebooster', 'opcosign', 'status', 'status_rdv', 'client_of', 'date_rdv', 'heure_rdv', 'type_rdv', 'rdv_honore', 'proposition', 'signe', 'date_signe', 'ca_signe_ht', 'nb_heures_formation', 'tx_horaire_ca', 'campagne_act', 'pec', 'echeances_pec', 'suivi_formation', 'budget_opco', 'annee_budget'];

    const categorized = {
      enterprise: allowedConfigs.filter(c => enterpriseKeys.includes(c.key)),
      contact: allowedConfigs.filter(c => contactKeys.includes(c.key)),
      commercial: allowedConfigs.filter(c => commercialKeys.includes(c.key)),
      others: allowedConfigs.filter(c => !enterpriseKeys.includes(c.key) && !contactKeys.includes(c.key) && !commercialKeys.includes(c.key))
    };
    return categorized;
  }, [allowedConfigs]);

  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      
      {/* Top Navigation Bar */}
      <div className="h-14 bg-card border-b border-navy/5 flex items-center justify-between px-6 shadow-sm shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-lg transition-all text-navy/40">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              disabled={!prevLead}
              onClick={() => setCurrentLeadId(prevLead.id)}
              className="p-1.5 rounded-md hover:bg-navy/5 disabled:opacity-20 transition-all text-navy"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center min-w-[100px]">
              <span className="text-sm font-medium text-navy">Lead</span>
              <span className="text-sm font-black text-navy tracking-tighter">{currentIndex + 1} / {leads.length}</span>
            </div>
            <button 
              disabled={!nextLead}
              onClick={() => setCurrentLeadId(nextLead.id)}
              className="p-1.5 rounded-md hover:bg-navy/5 disabled:opacity-20 transition-all text-navy"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Form & Info */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-card border-r border-navy/5 relative">
          
          <div className="px-12 pt-6 pb-12 space-y-12">
            {/* Header Title */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black text-navy leading-tight tracking-tighter">
                    {getLeadValue('nom_entreprise')}
                  </h1>
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm"
                    style={{ 
                      backgroundColor: getStatusStyle(getLeadValue('status'), isDarkMode, getOptions('status')).bg, 
                      color: getStatusStyle(getLeadValue('status'), isDarkMode, getOptions('status')).text 
                    }}
                  >
                    {getLeadValue('status') || 'PROSPECT'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-navy/40">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <Hash className="w-3.5 h-3.5" /> {getLeadValue('siret') || '—'}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-navy/10" />
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" /> {getLeadValue('adresse') || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-20">
              {/* Column 1: Core Info */}
              <div className="space-y-10">
                {groups.contact.length > 0 && (
                  <div className="space-y-6">
                    <SectionTitle icon={Smartphone} label="Contact" />
                    <div className="space-y-4">
                      {groups.contact.map(col => (
                        <EditableField 
                          key={col.key}
                          label={col.label}
                          value={getLeadValue(col.key)}
                          name={col.key}
                          type="text"
                          onChange={handleAutoSave}
                          readOnly={readOnlyKeys.includes(col.key)}
                          disabled={isLocked}
                          isDarkMode={isDarkMode}
                          onConfigure={() => setStatusModalConfig(col)}
                          isAdmin={user?.role === 'admin'}
                          isPhone={['tel', 'mobile'].includes(col.key)}
                          siret={lead.siret}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groups.enterprise.length > 0 && (
                  <div className="space-y-6">
                    <SectionTitle icon={Building2} label="Informations Entreprise" />
                    <div className="space-y-4">
                      {groups.enterprise.map(col => (
                        <EditableField 
                          key={col.key}
                          label={col.label}
                          value={getLeadValue(col.key)}
                          name={col.key}
                          isMono={['siret', 'code_naf', 'idcc'].includes(col.key)}
                          type={col.type === 'number' || col.type === 'currency' ? 'number' : col.type === 'date_picker' || col.type === 'date' ? 'date' : 'text'}
                          options={getOptions(col.key)}
                          onChange={handleAutoSave}
                          readOnly={readOnlyKeys.includes(col.key)}
                          disabled={isLocked}
                          isDarkMode={isDarkMode}
                          onConfigure={() => setStatusModalConfig(col)}
                          isAdmin={user?.role === 'admin'}
                          isPhone={['tel', 'mobile'].includes(col.key)}
                          siret={lead.siret}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Status & Custom */}
              <div className="space-y-10">
                {groups.commercial.length > 0 && (
                  <div className="space-y-6">
                    <SectionTitle icon={Calendar} label="Suivi Commercial" />
                    <div className="space-y-4">
                      {groups.commercial.map(col => (
                        <EditableField 
                          key={col.key}
                          label={col.label}
                          value={getLeadValue(col.key)}
                          name={col.key}
                          options={getOptions(col.key)}
                          type={col.type === 'number' || col.type === 'currency' ? 'number' : col.type === 'date_picker' || col.type === 'date' ? 'date' : 'text'}
                          onChange={handleAutoSave}
                          readOnly={readOnlyKeys.includes(col.key)}
                          disabled={isLocked}
                          isDarkMode={isDarkMode}
                          onConfigure={() => setStatusModalConfig(col)}
                          isAdmin={user?.role === 'admin'}
                          isPhone={['tel', 'mobile'].includes(col.key)}
                          siret={getLeadValue('siret')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groups.others.length > 0 && (
                  <div className="space-y-6">
                    <SectionTitle icon={Layers} label="Champs Spécifiques" />
                    <div className="space-y-4">
                      {groups.others.map(col => (
                        <EditableField 
                          key={col.key}
                          label={col.label}
                          value={getLeadValue(col.key)}
                          name={col.key}
                          options={getOptions(col.key)}
                          type={col.type === 'number' ? 'number' : col.type === 'date_picker' ? 'date' : 'text'}
                          onChange={handleAutoSave}
                          readOnly={readOnlyKeys.includes(col.key)}
                          disabled={isLocked}
                          isDarkMode={isDarkMode}
                          onConfigure={() => setStatusModalConfig(col)}
                          isAdmin={user?.role === 'admin'}
                          isPhone={['tel', 'mobile'].includes(col.key)}
                          siret={getLeadValue('siret')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Template Section */}
            {generateMessage() !== "" && (
              <div className="pt-10 border-t border-navy/5">
                <div className="flex items-center justify-between mb-6">
                  <SectionTitle icon={MessageSquare} label="Template de Transmission" />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generateMessage());
                      setMessageCopied(true);
                      setTimeout(() => setMessageCopied(false), 2000);
                    }}
                  className="flex items-center gap-2 px-4 py-2 bg-navy/5 text-navy hover:bg-active hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    {messageCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {messageCopied ? 'Copié' : 'Copier le message'}
                  </button>
                </div>
                <div className="bg-navy/[0.02] p-8 rounded-[2rem] border border-navy/5 font-mono text-xs leading-relaxed text-navy/60 whitespace-pre-wrap">
                  {generateMessage()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Dedicated Commentary */}
        <div className="w-[400px] bg-background flex flex-col shrink-0 border-l border-navy/5">
          <div className="h-14 border-b border-navy/5 flex items-center px-6 bg-card shrink-0">
            <h3 className="text-sm font-medium text-navy">Commentaires</h3>
          </div>

          <div className="flex-1 p-6 bg-card overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-navy/30">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium text-navy">Note sur l'entreprise</span>
              </div>
              <textarea
                value={localComment}
                disabled={isLocked}
                onChange={e => {
                  const val = e.target.value;
                  setLocalComment(val);
                  
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = setTimeout(() => {
                    handleAutoSave('observation', val);
                  }, 1000);
                }}
                placeholder="Saisissez vos commentaires ici..."
                className={`w-full h-[calc(100vh-250px)] p-6 bg-navy/[0.02] border border-navy/10 rounded-[2rem] text-sm focus:outline-none focus:border-primary/30 transition-all resize-none font-medium leading-relaxed ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
              />
              <div className="flex items-center justify-between px-4">
                <span className="text-[9px] font-bold text-navy uppercase">Enregistrement automatique</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-green-600 uppercase">Synchronisé</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {statusModalConfig && (
        <StatusConfigModal 
          isOpen={true}
          column={statusModalConfig}
          onClose={() => setStatusModalConfig(null)}
          onRefresh={() => {
            // Need to trigger a reload of columns in parent or here
            window.location.reload(); // Simple way to ensure everything syncs
          }}
        />
      )}
    </div>
  );
};

const getStatusStyle = (raw, isDarkMode, dynamicOptions = []) => {
  const STATUS_COLORS = {
    'a traiter':            { bg: isDarkMode ? '#1e293b' : '#f1f5f9', text: isDarkMode ? '#94a3b8' : '#64748b' }, 
    'absent':               { bg: '#64748b', text: '#fff' },
    'deja pec':             { bg: '#8b5cf6', text: '#fff' },
    'faux num':             { bg: '#dc2626', text: '#fff' },
    'hors cible opco':      { bg: '#374151', text: '#9ca3af' },
    'hors cible siège':     { bg: '#374151', text: '#9ca3af' },
    'hors cible salariés':  { bg: '#374151', text: '#9ca3af' },
    'nrp':                  { bg: '#1d4ed8', text: '#fff' },
    'occupé':               { bg: '#0891b2', text: '#fff' },
    'pas de num':           { bg: '#7c3aed', text: '#fff' },
    'pi':                   { bg: '#0f172a', text: '#ff007f' },
    'rappel':               { bg: '#d97706', text: '#fff' },
    'rdv':                  { bg: '#16a34a', text: '#fff' },
    'en attente rdv':       { bg: '#f97316', text: '#fff' },
    'repondeur':            { bg: '#475569', text: '#fff' },
    'signe':                { bg: '#ff007f', text: '#fff' },
    'à renseigner':         { bg: isDarkMode ? '#1a1a1a' : '#e2e8f0', text: isDarkMode ? '#475569' : '#475569' },
    'default':              { bg: isDarkMode ? '#1a1a1a' : '#f1f5f9', text: isDarkMode ? '#cbd5e1' : '#0f172a' }
  };
  if (!raw) return STATUS_COLORS['default'];
  const key = raw.toLowerCase().trim();

  // Check dynamic options (format: "LABEL::COLOR" or "LABEL::COLOR::VISIBILITY")
  if (dynamicOptions && dynamicOptions.length > 0) {
    const match = dynamicOptions.find(opt => opt.split('::')[0].toLowerCase().trim() === key);
    if (match && match.includes('::')) {
      const parts = match.split('::');
      const color = parts[1] || '';
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) || 0;
      const g = parseInt(hex.substr(2, 2), 16) || 0;
      const b = parseInt(hex.substr(4, 2), 16) || 0;
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return { bg: color, text: yiq >= 170 ? '#000' : '#fff' };
    }
  }

  return STATUS_COLORS[key] || STATUS_COLORS['default'];
};

const SectionTitle = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center text-navy/40">
      <Icon className="w-4 h-4" />
    </div>
    <h3 className="text-sm font-medium text-navy">{label}</h3>
  </div>
);

const CustomDropdown = ({ value, options, onChange, placeholder = "— CHOISIR —", disabled, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStyle = getStatusStyle(value, false); // Temporarily used to detect if it's a known status

  return (
    <div className="relative" ref={containerRef}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-3 py-1.5 rounded-xl text-sm font-medium flex items-center justify-between transition-all shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
        style={{ 
          backgroundColor: value ? getStatusStyle(value, isDarkMode, options).bg : 'transparent', 
          color: value ? getStatusStyle(value, isDarkMode, options).text : 'inherit' 
        }}
      >
        <span className="truncate mr-2">
          {(value || placeholder).split('::')[0]}
        </span>
        <ChevronDown 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: value ? currentStyle.text : 'inherit', opacity: 0.5 }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-[100] mt-1 w-full min-w-[200px] bg-card border border-navy/10 rounded-xl shadow-2xl overflow-hidden p-1"
          >
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 text-[10px] font-black text-navy/30 uppercase tracking-widest hover:bg-navy/5 rounded-lg transition-colors"
              >
                {placeholder}
              </button>
              {options.filter(opt => {
                const parts = opt.split('::');
                const label = parts[0];
                const isHidden = parts[2] === 'h';
                return !isHidden || label === value;
              }).map(opt => {
                const label = opt.split('::')[0];
                const cfg = getStatusStyle(label, isDarkMode, options);
                return (
                  <button
                    key={opt}
                    onClick={() => { onChange(label); setIsOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-navy/5 rounded-lg flex items-center justify-between group transition-all"
                  >
                    <span 
                      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-all group-hover:scale-105"
                      style={{ backgroundColor: cfg.bg, color: cfg.text }}
                    >
                      {label}
                    </span>
                    {value === label && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditableField = ({ label, value, onChange, name, isMono, type = 'text', options, readOnly, disabled, isDarkMode, isAdmin, onConfigure, isPhone, siret }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(name, localValue);
    }
    setIsEditing(false);
  };

  const matchedValue = useMemo(() => {
    if (!options || !localValue) return localValue;
    const match = options.find(opt => opt.toLowerCase() === String(localValue).toLowerCase());
    return match || localValue;
  }, [localValue, options]);

  const isUrl = typeof value === 'string' && (value.startsWith('http') || value.includes('.com') || value.includes('.fr'));

  return (
    <div className="flex items-start gap-4 group/field">
      <div className="w-32 flex items-center gap-1 shrink-0 pt-1.5">
        <span className="text-sm font-medium text-navy">{label}</span>
        {isAdmin && options && (
          <button 
            onClick={(e) => { e.stopPropagation(); onConfigure(); }}
            className="opacity-0 group-hover/field:opacity-100 p-1 hover:bg-navy/5 rounded transition-all text-navy/20 hover:text-primary"
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {(readOnly || (disabled && !isEditing)) ? (
          name === 'pappers' && isUrl ? (
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-500 text-[10px] font-bold uppercase tracking-wider transition-all group shadow-sm active:scale-95"
              onClick={(e) => e.stopPropagation()}
            >
              Pappers
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          ) : (
          <div className={`py-1 text-sm font-bold ${disabled ? 'text-navy/40 cursor-not-allowed' : 'text-navy'} ${isMono ? 'font-mono tracking-tighter' : ''}`}>
            {value || '—'}
          </div>
          )
        ) : options ? (
          <CustomDropdown 
            value={matchedValue} 
            options={options} 
            disabled={disabled}
            onChange={(val) => onChange(name, val)} 
            isDarkMode={isDarkMode}
          />
        ) : isEditing ? (
          <input 
            autoFocus
            type={type} 
            value={localValue} 
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            className={`w-full bg-navy/[0.02] border-b border-primary px-1 py-1 text-sm font-bold text-navy focus:outline-none transition-all ${isMono ? 'font-mono tracking-tighter' : ''}`}
          />
        ) : (
          <div className="flex items-center justify-between gap-2 group/inner">
            <div className="truncate flex-1">
              {isUrl ? (
                isPhone ? (
                  <div className="flex items-center gap-2 group/telbtn">
                    <a
                      href={value.startsWith('http') ? value : `https://${value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-1 bg-navy/5 hover:bg-primary/10 border border-navy/10 hover:border-primary/30 rounded-lg text-navy hover:text-primary text-xs font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap w-fit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📞 Phone
                    </a>
                    {siret && (
                      <a
                        href={`https://datalegal.fr/entreprises/${String(siret).replace(/\s+/g, '').substring(0, 9)}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-1 bg-navy/5 hover:bg-blue-500/10 border border-navy/10 hover:border-blue-400/30 rounded-lg text-navy hover:text-blue-500 text-xs font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap w-fit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 Phone 2
                      </a>
                    )}
                  </div>
                ) : (
                  <a 
                    href={value.startsWith('http') ? value : `https://${value}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-bold text-sm truncate block"
                  >
                    {value}
                  </a>
                )
              ) : (
                <span className={`text-sm font-bold text-navy truncate block ${isMono ? 'font-mono tracking-tighter' : ''}`}>
                  {value || '—'}
                </span>
              )}
            </div>
            {!disabled && (
              isUrl && isPhone ? (
                <button 
                  onClick={() => onChange(name, '')}
                  className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg opacity-0 group-hover/field:opacity-100 transition-all shadow-sm ml-1"
                  title="Supprimer le lien"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 opacity-0 group-hover/field:opacity-100 text-navy/20 hover:text-primary transition-all"
                  title="Modifier"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadFullDetail;
