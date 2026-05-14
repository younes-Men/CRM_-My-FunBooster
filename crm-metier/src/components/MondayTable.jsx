import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import { 
  Search, Filter, ChevronDown, ChevronUp, Download, Eye, Plus, 
  Trash2, X, Check, Save, Calendar, Phone, Mail, User, 
  AlertCircle, MoreVertical, LayoutGrid, RefreshCw, Settings, Pencil,
  MapPin, Hash, Briefcase, FileText, ArrowRight, ArrowLeft, Clock, ExternalLink, Copy, Sparkles, Wand2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LeadDetailPanel from './LeadDetailPanel';
import ColumnManagerModal from './ColumnManagerModal';
import opcoMapping from '../data/opco_mapping.json';
import nafMapping from '../data/naf_mapping.json';
import secteurMapping from '../data/secteur_mapping.json';


// Status badge colors (case-insensitive match)
const STATUS_COLORS = {
  'a traiter':            { bg: '#f1f5f9', text: '#64748b' }, 
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
  'en attente rdv':       { bg: '#f97316', text: '#fff' }, // Orange pour l'attente
  'repondeur':            { bg: '#475569', text: '#fff' },
  'signe':                { bg: '#ff007f', text: '#fff' },
  // Status Gérant colors (matching user image)
  'à renseigner':         { bg: '#e2e8f0', text: '#475569' },
  'tns':                  { bg: '#c084fc', text: '#fff' },
  '2 tns':                { bg: '#e9d5ff', text: '#7e22ce' },
  'gérant salarié':       { bg: '#facc15', text: '#713f12' },
  '2 gérants salariés':   { bg: '#a3e635', text: '#365314' },
  // RDV / Formation / Campagne colors
  'téléphonique':         { bg: '#e0f2fe', text: '#0369a1' },
  'physique':             { bg: '#dcfce7', text: '#15803d' },
  'planifiée':            { bg: '#eff6ff', text: '#1d4ed8' },
  'organisée':            { bg: '#f0fdf4', text: '#15803d' },
  'en cours':             { bg: '#fef9c3', text: '#a16207' },
  'terminée':             { bg: '#f1f5f9', text: '#475569' },
  'conquête':             { bg: '#fee2e2', text: '#b91c1c' },
  'fidélisation':         { bg: '#dcfce7', text: '#15803d' },
  're-conquête':          { bg: '#fef3c7', text: '#b45309' },
  'oui':                  { bg: '#dcfce7', text: '#15803d' },
  'non':                  { bg: '#fee2e2', text: '#b91c1c' },
  // RDV Status Commercial (Sync with Pipeline Stages)
  'nouveau':              { bg: '#f3e8ff', text: '#6d28d9' },
  'rap':                  { bg: '#f1f5f9', text: '#64748b' },
  'proposition':          { bg: '#fee2e2', text: '#ef4444' },
  'signé':                { bg: '#eff6ff', text: '#3b82f6' },
  'pec':                  { bg: '#f1f5f9', text: '#1e293b' },
  'gagné':                { bg: '#dcfce7', text: '#22c55e' },
  'organisé':             { bg: '#ecfeff', text: '#06b6d4' },
  // Client OF specific colors
  'ca conseils':          { bg: '#fff7ed', text: '#c2410c' }, // Orange
  'tb formations':        { bg: '#eff6ff', text: '#1d4ed8' }, // Blue
  'go conseils':          { bg: '#f0fdf4', text: '#15803d' }, // Green
  'hors zone':            { bg: '#fdf2f8', text: '#be185d' }, // Pink
  'it performance':       { bg: '#fefce8', text: '#a16207' }, // Yellow
  // Default fallback
  'default':              { bg: '#f1f5f9', text: '#94a3b8' }
};

const getStatusStyle = (raw) => {
  if (!raw) return STATUS_COLORS['à renseigner'] || STATUS_COLORS['default'];
  const key = raw.toLowerCase().trim();
  return STATUS_COLORS[key] || STATUS_COLORS['default'];
};

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

const COLUMNS = [
  { label: 'Funbooster',   key: 'funebooster',       width: 160, type: 'select', options: [
    'BENZAYDOUNE', 'LABIBA', 'MERYEM', 'SOUKAINA', 'WISSAL', 'AMRI', 'KHADIJA', 'WIJDAN', 'GHITA'
  ]},
  { label: 'Entreprise',   key: 'nom_entreprise',    width: 240, bold: true },
  { label: 'Nº Siret',     key: 'siret',             width: 200, mono: true },
  { label: 'Téléphone',    key: 'tel',               width: 180, type: 'editable' },
  { label: 'Statut',       key: 'status',            width: 180, type: 'select', options: [
    'A TRAITER', 'PAS DE NUM', 'REPONDEUR', 'OCCUPÉ', 'EN ATTENTE RDV', 'RDV', 'SIGNE', 'RAPPEL', 'NRP', 
    'HORS CIBLE OPCO', 'HORS CIBLE SALARIÉS', 'HORS CIBLE SIÈGE', 'DEJA PEC', 'ABSENT', 'PI', 'FAUX NUM'
  ]},
  { label: 'Opco',         key: 'nom_opco',          width: 150, type: 'select', options: [
    'OPCOMMERCE', 'OPCO EP', 'OPCO AKTO', 'OPCO ATLAS', 'AFDAS', 'CONSTRUCTYS', 
    'MOBILITÉ', 'OPCO 2i', 'UNIFORMATION', 'OPCO SANTÉ', 'OCAPIAT'
  ]},
  { label: 'Client OF',    key: 'client_of',         width: 180, type: 'select', options: [
    'CA CONSEILS', 'HORS ZONE', 'TB FORMATIONS', 'IT PERFORMANCE', 'GO CONSEILS'
  ]},
  { label: 'Opcosign',     key: 'opcosign',          width: 180, type: 'editable' },
  { label: 'ID',           key: 'lead_id',           width: 100, mono: true },
  { label: 'Gérant',       key: 'gerant',            width: 300, type: 'editable' },
  { label: 'Secteur Act.',  key: 'secteur_activite',  width: 180, type: 'editable' },
  { label: 'Libellé Act.',  key: 'libelle_activite',  width: 200, type: 'editable' },
  { label: 'IDCC',         key: 'idcc',              width: 100, type: 'editable' },
  { label: 'Code NAF',     key: 'code_naf',          width: 130, type: 'editable' },
  { label: 'Pappers',      key: 'pappers',           width: 130, type: 'pappers' },
  { label: 'Mobile',       key: 'mobile',            width: 180, type: 'editable' },
  { label: 'Adresse',      key: 'adresse',           width: 260, type: 'editable' },
  { label: 'Code Postal',  key: 'code_postal',       width: 100, type: 'auto' },
  { label: 'Code Dépt.',   key: 'code_departement',  width: 100, type: 'auto' },
  { label: 'Statut RDV',   key: 'status_rdv',        width: 180, type: 'select', options: [
    'Nouveau', 'RAP', 'Proposition', 'Signé', 'PEC', 'Gagné', 'ORGANISÉ'
  ]},
  { label: 'E-mail',       key: 'email',             width: 200, type: 'editable' },
  { label: 'Site Web',     key: 'site_web',          width: 180, type: 'editable' },
  { label: 'Statut Gérant', key: 'statut_gerant',     width: 150, type: 'select', options: ['TNS', '2 TNS', 'GÉRANT SALARIÉ', '2 GÉRANTS SALARIÉS'] },
  { label: 'Nb Salariés',  key: 'nb_salaries',       width: 100, type: 'number' },
  { label: 'Nb Apprentis', key: 'nb_apprentis',      width: 110, type: 'number' },
  { label: 'Date Modif',   key: 'date_modification', width: 150, type: 'date' },
  { label: 'Budget Opco',  key: 'budget_opco',       width: 120, type: 'currency' },
  { label: 'Année Budget', key: 'annee_budget',      width: 110, type: 'number' },
  { label: 'Date RDV',     key: 'date_rdv',          width: 130, type: 'date_picker' },
  { label: 'Heure RDV',    key: 'heure_rdv',         width: 100, type: 'time' },
  { label: 'Type RDV',     key: 'type_rdv',          width: 130, type: 'select', options: ['TÉLÉPHONIQUE', 'PHYSIQUE'] },
  { label: 'RDV Honoré ?', key: 'rdv_honore',        width: 120, type: 'select', options: ['OUI', 'NON'] },
  { label: 'Proposition',  key: 'proposition',       width: 120, type: 'select', options: ['OUI', 'NON', 'EN COURS'] },
  { label: 'Signé',        key: 'signe',             width: 120, type: 'select', options: ['OUI', 'NON', 'EN COURS'] },
  { label: 'Date Sign',    key: 'date_signe',        width: 130, type: 'date_picker' },
  { label: 'CA Signé HT',  key: 'ca_signe_ht',       width: 120, type: 'currency' },
  { label: 'Nb Heures',    key: 'nb_heures_formation', width: 100, type: 'number' },
  { label: 'TX Horaire',   key: 'tx_horaire_ca',     width: 120, type: 'auto_currency' },
  { label: 'Campagne',     key: 'campagne_act',      width: 150, type: 'select', options: ['CONQUÊTE', 'FIDÉLISATION', 'RE-CONQUÊTE'] },
  { label: 'PEC',          key: 'pec',               width: 120, type: 'select', options: ['OUI', 'NON'] },
  { label: 'Échéances PEC', key: 'echeances_pec',     width: 200, type: 'pec_dates' },
  { label: 'Suivi Form.',  key: 'suivi_formation',   width: 150, type: 'select', options: ['PLANIFIÉE', 'ORGANISÉE', 'EN COURS', 'TERMINÉE'] },
  { label: 'Commentaires', key: 'observation',       width: 260, type: 'editable' },
];
const PAGE_SIZE = 100;

const SearchInput = React.memo(({ value: externalValue, onSearch }) => {
  const [localValue, setLocalValue] = useState(externalValue);
  useEffect(() => { setLocalValue(externalValue); }, [externalValue]);
  useEffect(() => {
    const timer = setTimeout(() => { if (localValue !== externalValue) onSearch(localValue); }, 500);
    return () => clearTimeout(timer);
  }, [localValue, onSearch, externalValue]);
  return (
    <div className="relative group">
      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy/20 group-focus-within:text-primary transition-colors" />
      <input
        type="text"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        placeholder="Rechercher une entreprise, SIRET..."
        className="pl-11 pr-5 py-3.5 bg-white border border-navy/10 rounded-2xl text-sm text-navy placeholder:text-navy/20 focus:outline-none focus:ring-4 focus:ring-primary/5 w-80 transition-all shadow-sm"
      />
    </div>
  );
});

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatDateFr = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) { return d; }
};

const CustomSelect = React.memo(({ value, options, onChange, colorCfg }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => { 
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
         setIsOpen(false); 
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  return (
    <div ref={containerRef} className="relative w-full">
      <button
        onClick={(e) => { e.stopPropagation(); if (!isOpen) setRect(containerRef.current.getBoundingClientRect()); setIsOpen(!isOpen); }}
        style={{ backgroundColor: colorCfg.bg, color: colorCfg.text }}
        className="w-full pl-2 pr-5 py-1.5 rounded-lg font-black uppercase tracking-tight flex items-center justify-between shadow-sm group/btn transition-all active:scale-[0.98] min-h-[28px] relative overflow-hidden"
      >
        <span className={`whitespace-nowrap leading-none ${value && value.length > 10 ? 'text-[8.5px]' : 'text-[10px]'}`}>{value || 'CHOISIR'}</span>
        <div className="flex-shrink-0 ml-1 opacity-40 group-hover/btn:opacity-100 transition-all">
          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <DropdownPortal targetRect={rect}>
          <div ref={dropdownRef} className="absolute top-0 left-0 w-full min-w-[200px] z-[9999] bg-white border border-navy/10 rounded-2xl shadow-[0_20px_50px_rgba(14,27,77,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top" onClick={(e) => e.stopPropagation()}>
            <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
              <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(''); setIsOpen(false); }} className="w-full px-4 py-1.5 text-left text-[9px] font-black text-navy/30 hover:bg-navy/5 hover:text-navy uppercase tracking-[0.2em] transition-colors">— RÉINITIALISER —</button>
              <div className="h-px bg-navy/5 mx-2 my-1" />
              {options.map((opt) => (
                <button key={opt} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt); setIsOpen(false); }} className={`w-full px-4 py-1.5 text-left text-[11px] font-bold transition-all flex items-center justify-between group/opt ${value === opt ? 'bg-navy text-white' : 'text-navy/70 hover:bg-primary/5 hover:text-primary'}`}>
                  {opt}
                  {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              ))}
            </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
});

const DropdownPortal = ({ children, targetRect }) => {
  if (!targetRect) return null;
  return createPortal(<div className="fixed z-[9999]" style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width }}>{children}</div>, document.body);
};

const formatNaf = (val) => {
  if (!val) return val;
  const clean = String(val).toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // If we have 5 characters, format as XX.XXY
  if (clean.length === 5) {
    return `${clean.substring(0, 2)}.${clean.substring(2, 4)}${clean.substring(4)}`;
  }
  
  // If we have 4 characters, try to find the letter in the mapping
  if (clean.length === 4) {
    const keys = Object.keys(nafMapping);
    const matches = keys.filter(k => k.startsWith(clean));
    if (matches.length === 1) {
      const full = matches[0];
      return `${full.substring(0, 2)}.${full.substring(2, 4)}${full.substring(4)}`;
    }
    return `${clean.substring(0, 2)}.${clean.substring(2)}`;
  }
  
  return val;
};

const TableCell = React.memo(({ lead, col, handleUpdate, isActive, activePicker, setActivePicker, pickerRef, index, enrichLead, isEnriching }) => {
  const [copied, setCopied] = useState(false);
  const [localEdit, setLocalEdit] = useState(false);
  const containerRef = useRef(null);

  // Check if data is in native column or custom_fields
  let raw = lead[col.key];
  // If native column is empty or contains '---', try fallback to custom_fields
  if (raw === undefined || raw === null || raw === '' || raw === '---') {
    if (lead.custom_fields && lead.custom_fields[col.key]) {
      raw = lead.custom_fields[col.key];
    }
  }
  
  // Robust NAF mapping fallback
  let displayRaw = raw || '';
  if (col.key === 'code_naf' && !displayRaw && lead.secteur) displayRaw = lead.secteur;
  
  if (col.key === 'code_naf' && displayRaw) {
    displayRaw = formatNaf(displayRaw);
  }

  if (col.key === 'nom_entreprise') {
    return (
      <div className="flex items-center gap-2 group/ent min-w-0 pr-2">
        <span className={['truncate block text-sm', col.bold ? 'text-navy font-bold' : 'text-navy/70'].join(' ')} title={displayRaw}>{displayRaw}</span>
        {lead.siret && lead.siret !== '---' && (
          <button 
            onClick={(e) => { e.stopPropagation(); enrichLead(lead.id, lead.siret); }}
            disabled={isEnriching}
            title="Enrichir automatiquement (Gérant & IDCC)"
            className={`p-1 rounded-md transition-all flex-shrink-0 ${isEnriching ? 'bg-primary/10 text-primary' : 'opacity-0 group-hover/ent:opacity-100 hover:bg-primary/10 hover:text-primary'}`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isEnriching ? 'animate-pulse' : 'hover:scale-110 transition-transform'}`} />
          </button>
        )}
      </div>
    );
  }

  if (col.key === 'libelle_activite' && !displayRaw && (lead.code_naf || lead.secteur)) {
    const nafValue = lead.code_naf || lead.secteur;
    const cleanNaf = String(nafValue).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let description = nafMapping[cleanNaf];
    
    // Fuzzy match if incomplete (4 digits)
    if (!description && cleanNaf.length === 4) {
      const matches = Object.keys(nafMapping).filter(k => k.startsWith(cleanNaf));
      if (matches.length === 1) description = nafMapping[matches[0]];
    }

    if (description) {
      displayRaw = description;
    }
  }

  if (col.key === 'siret' && raw) {
    return (
      <div className="flex items-center gap-2 group/siret min-w-0 pr-2">
        <span className="text-sm font-bold text-navy/90 font-mono tracking-tighter whitespace-nowrap">{raw}</span>
        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(raw); setCopied(true); setTimeout(() => setCopied(false), 2000); }} title="Copier le SIRET" className="p-1 hover:bg-navy/5 rounded-md transition-all opacity-0 group-hover/siret:opacity-100 flex-shrink-0 hover:scale-110 active:scale-95">
          {copied ? <Check className="w-3.5 h-3.5 text-green-500 animate-in zoom-in duration-200" /> : <Copy className="w-3.5 h-3.5 text-navy/20 hover:text-navy/50 transition-colors" />}
        </button>
      </div>
    );
  }
  
  if (col.type === 'status' || col.type === 'select') {
    const cfg = getStatusStyle(raw);
    return <CustomSelect value={raw} options={col.options} onChange={(val) => handleUpdate(lead.id, col.key, val, col.is_custom)} colorCfg={cfg} />;
  }
  if (col.type === 'date') return <span className="flex items-center gap-1.5 text-navy/40 text-xs whitespace-nowrap"><Clock className="w-3 h-3 flex-shrink-0" />{formatDate(raw)}</span>;
  if (col.type === 'pappers') {
    const slug = slugify(lead.nom_entreprise || '');
    const siren = (lead.siret || '').substring(0, 9);
    const url = `https://www.pappers.fr/entreprise/${slug}-${siren}`;
    return <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-bold uppercase tracking-wider transition-all group shadow-sm active:scale-95" onClick={(e) => e.stopPropagation()}>Pappers<ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></a>;
  }
  if (col.type === 'editable' || col.key === 'tel' || col.key === 'mobile') {
    const isPhone = col.key === 'tel' || col.key === 'mobile';
    const isValUrl = typeof displayRaw === 'string' && (displayRaw.startsWith('http://') || displayRaw.startsWith('https://'));
    
    // Si c'est un lien, on l'affiche en priorité comme un lien cliquable
    if (isValUrl) {
      return (
        <div className="flex items-center gap-2 group/url min-w-0">
          <a 
            href={displayRaw} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 flex items-center gap-1.5 text-primary hover:text-primary-dark font-medium transition-colors group/link min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate block text-sm" title={displayRaw}>{displayRaw}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
          <button 
            onClick={(e) => { e.stopPropagation(); handleUpdate(lead.id, col.key, '', col.is_custom); }}
            className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg opacity-0 group-hover/url:opacity-100 transition-all shadow-sm flex-shrink-0"
            title="Supprimer le lien"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    // Si c'est un téléphone, on l'affiche en texte brut (pour Ringover) avec le style original
    if (isPhone && !localEdit) {
      return (
        <div className="flex items-center justify-between group/tel w-full px-2 py-1.5">
          <span className="text-sm text-navy/60 whitespace-nowrap">
            {displayRaw || '—'}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setLocalEdit(true); }}
            className="p-1 hover:bg-navy/5 rounded-md transition-all opacity-0 group-hover/tel:opacity-100 text-navy/20 hover:text-navy/50"
            title="Modifier le numéro"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      );
    }
    return (
      <input 
        type="text" 
        autoFocus={localEdit}
        key={`${lead.id}-${col.key}-${displayRaw}`} 
        defaultValue={displayRaw || ''} 
        onBlur={e => {
          setLocalEdit(false);
          if (e.target.value !== (displayRaw || '')) {
            handleUpdate(lead.id, col.key, e.target.value, col.is_custom);
          }
        }} 
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
        className="w-full px-2 py-1.5 bg-transparent hover:bg-white border border-transparent hover:border-navy/10 focus:bg-white focus:border-primary focus:outline-none rounded-lg text-navy/60 text-sm focus:text-navy transition-all placeholder:text-navy/20"
        placeholder="—" 
      />
    );
  }
  if (col.type === 'number') return <input type="number" defaultValue={raw || ''} onBlur={e => e.target.value !== String(raw || '') && handleUpdate(lead.id, col.key, e.target.value, col.is_custom)} className="w-full px-2 py-1.5 bg-transparent hover:bg-white border border-transparent hover:border-navy/10 focus:bg-white focus:border-primary focus:outline-none rounded-lg text-navy/60 text-sm focus:text-navy transition-all placeholder:text-navy/20" placeholder="0" />;
  if (col.type === 'currency' || col.type === 'auto_currency') {
    const isAuto = col.type === 'auto_currency';
    let displayValue = raw;
    if (isAuto && !displayValue && lead.ca_signe_ht && lead.nb_heures_formation) {
      const ca = parseFloat(lead.ca_signe_ht);
      const hrs = parseFloat(lead.nb_heures_formation);
      if (ca && hrs && hrs !== 0) displayValue = (ca / hrs).toFixed(2);
    }
    return (
      <div className="flex items-center gap-1 group/currency">
        <input type="number" readOnly={isAuto} defaultValue={displayValue || ''} onBlur={e => { if (!isAuto && e.target.value !== String(raw || '')) handleUpdate(lead.id, col.key, e.target.value, col.is_custom); }} className={`w-full px-2 py-1.5 bg-transparent ${isAuto ? '' : 'hover:bg-white border border-transparent hover:border-navy/10 focus:bg-white focus:border-primary'} focus:outline-none rounded-lg text-navy/60 text-sm focus:text-navy transition-all placeholder:text-navy/20 ${isAuto ? 'cursor-default font-medium text-primary' : ''}`} placeholder="0.00" />
        <span className="text-[10px] font-bold text-navy/30 pr-1">€</span>
      </div>
    );
  }
  if (col.type === 'date_picker') {
    return (
      <div className="relative group/picker w-full flex items-center">
        <div className="absolute inset-0 flex items-center justify-center text-navy text-[11px] font-bold pointer-events-none group-hover/picker:opacity-0 transition-opacity">{formatDateFr(raw)}</div>
        <input type="date" defaultValue={raw || ''} onChange={e => handleUpdate(lead.id, col.key, e.target.value, col.is_custom)} className="w-full pl-3 pr-8 py-1.5 bg-navy/[0.03] hover:bg-navy/[0.06] border border-transparent hover:border-navy/10 rounded-lg text-transparent hover:text-navy text-[11px] font-bold cursor-pointer transition-all" />
      </div>
    );
  }
  if (col.type === 'time') {
    const formatTime = (t) => { if (!t || t === '-' || t === ':') return ''; const [h, m] = t.split(/[:hH]/); return `${(h || '00').padStart(2, '0')}h${(m || '00').substring(0, 2).padStart(2, '0')}`; };
    const displayValue = formatTime(raw);
    return (
      <div className="flex justify-center p-1">
        <input type="text" defaultValue={displayValue} key={`${lead.id}-${col.key}-${displayValue}`} onBlur={e => { const val = e.target.value; if (val !== displayValue) handleUpdate(lead.id, col.key, val, col.is_custom); }} placeholder="--h--" className="w-[70px] px-2 py-1.5 bg-navy/5 border border-transparent hover:border-navy/10 rounded-xl text-navy text-[11px] font-black focus:bg-white focus:border-primary focus:outline-none transition-all font-mono text-center placeholder:text-navy/20" />
      </div>
    );
  }
  if (col.type === 'pec_dates') {
    const parts = (raw || '').split(' AU ');
    const start = parts[0]?.replace('DU ', '') || '';
    const end = parts[1] || '';
    const isActive = activePicker?.id === lead.id && activePicker?.field === col.key;
    const updatePec = (newStart, newEnd) => { const s = newStart || '...'; const e = newEnd || '...'; handleUpdate(lead.id, col.key, `DU ${s} AU ${e}`, col.is_custom); };
    return (
      <div className="relative" ref={containerRef}>
        <button onClick={(e) => { e.stopPropagation(); const rect = containerRef.current.getBoundingClientRect(); setActivePicker(isActive ? null : { id: lead.id, field: col.key, rect }); }} className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-lg group/pec transition-all w-full">
          <Clock className="w-3 h-3 text-primary/40 group-hover/pec:text-primary transition-colors" />
          <span className="text-[10px] font-black text-primary uppercase tracking-tighter truncate">{raw || 'DU ... AU ...'}</span>
        </button>
        {isActive && (
          <DropdownPortal targetRect={activePicker?.rect}>
            <div ref={pickerRef} className={`absolute left-0 z-[9999] bg-white border border-navy/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 flex flex-col gap-3 min-w-[300px] animate-in fade-in zoom-in-95 duration-200 ${index < 3 ? 'top-0' : 'bottom-0'}`}>
              <div className="flex items-center justify-between border-b border-navy/5 pb-2 mb-1"><span className="text-[10px] font-black text-navy uppercase tracking-widest">Échéances PEC</span><button onClick={() => setActivePicker(null)} className="text-navy/20 hover:text-navy">×</button></div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-1"><span className="text-[9px] font-bold text-navy/40 uppercase ml-1">Début</span><input type="date" value={start} onChange={e => updatePec(e.target.value, end)} className="w-full bg-navy/5 border-none rounded-xl px-3 py-2 text-xs text-navy font-bold focus:ring-2 focus:ring-primary/20" /></div>
                <div className="flex-1 flex flex-col gap-1"><span className="text-[9px] font-bold text-navy/40 uppercase ml-1">Fin</span><input type="date" value={end} onChange={e => updatePec(start, e.target.value)} className="w-full bg-navy/5 border-none rounded-xl px-3 py-2 text-xs text-navy font-bold focus:ring-2 focus:ring-primary/20" /></div>
              </div>
              <div className="px-3 py-2 bg-primary text-white rounded-xl text-center"><span className="text-[10px] font-black uppercase tracking-widest leading-none">{raw || 'DU ... AU ...'}</span></div>
            </div>
          </DropdownPortal>
        )}
      </div>
    );
  }
  if (col.type === 'auto') {
    let displayValue = raw;
    if (!displayValue && lead.adresse) {
      if (col.key === 'code_postal') { const cpMatch = lead.adresse.match(/\b\d{5}\b/); if (cpMatch) displayValue = cpMatch[0]; }
      else if (col.key === 'code_departement') { const cpMatch = lead.adresse.match(/\b\d{5}\b/); if (cpMatch) displayValue = cpMatch[0].substring(0, 2); }
    }
    return <span className={`${!raw && displayValue ? 'text-primary' : 'text-navy/40'} text-xs italic font-medium`}>{displayValue || 'auto'}</span>;
  }
  let displayVal = displayRaw;
  if (col.key === 'lead_id') displayVal = (lead.status?.toUpperCase() === 'RDV' && raw) ? `D-${String(raw).padStart(5, '0')}` : '—';
  
  const isUrl = typeof displayVal === 'string' && (displayVal.startsWith('http://') || displayVal.startsWith('https://'));

  if (isUrl) {
    return (
      <div className="flex items-center gap-2 group/url min-w-0">
        <a 
          href={displayVal} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex-1 flex items-center gap-1.5 text-primary hover:text-primary-dark font-medium transition-colors group/link min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate block text-sm" title={displayVal}>{displayVal}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
        </a>
        <button 
          onClick={(e) => { e.stopPropagation(); handleUpdate(lead.id, col.key, '', col.is_custom); }}
          className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg opacity-0 group-hover/url:opacity-100 transition-all shadow-sm flex-shrink-0"
          title="Supprimer le lien"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return <span className={[(col.key === 'siret' || col.key === 'lead_id') ? 'block text-xs font-bold' : 'truncate block text-sm', col.bold ? 'text-navy font-bold' : 'text-navy/70', col.mono ? 'font-mono tracking-tighter text-navy/90' : ''].join(' ')} title={displayVal || ''}>{displayVal || '—'}</span>;
});

const TableRow = React.memo(({ data, index, style }) => {
  const { leads, columns, handleUpdate, activePicker, setActivePicker, pickerRef, onDoubleClick, clickedRowId, onClick, enrichLead, enrichingId } = data;
  const lead = leads[index];
  const isClicked = clickedRowId === lead.id;
  const isActive = activePicker?.id === lead.id;
  const isEnriching = enrichingId === lead.id;
  return (
    <div style={{ ...style, zIndex: isActive ? 100 : 1 }} className={`flex items-center hover:bg-[#ffdee4] transition-colors group/row cursor-pointer ${isClicked ? 'bg-[#ffdee4]' : ''}`} onClick={() => onClick(lead.id)} onDoubleClick={() => onDoubleClick(lead.id)}>
      {columns.map(col => (
        <div key={col.key} style={{ width: col.width, minWidth: col.width }} className={`flex-shrink-0 px-6 py-3 border-l border-navy/[0.02] ${col.type === 'pec_dates' || col.type === 'select' ? '' : 'overflow-hidden'}`}>
          <TableCell lead={lead} col={col} handleUpdate={handleUpdate} isActive={isActive && activePicker?.field === col.key} activePicker={activePicker} setActivePicker={setActivePicker} pickerRef={pickerRef} index={index} enrichLead={enrichLead} isEnriching={enrichingId === lead.id && col.key === 'nom_entreprise'} />
        </div>
      ))}
    </div>
  );
});

const FILTERABLE_COLUMNS = ['funebooster', 'nom_opco', 'idcc', 'code_naf', 'tel', 'mobile', 'code_departement', 'status', 'client_of', 'date_rdv', 'date_signe'];
const uniqueValuesCache = {};

const useUniqueValues = (field, initialSearch = '') => {
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchValues = useCallback(async (searchTerm = '') => {
    // Check cache for empty search (initial load)
    if (!searchTerm && uniqueValuesCache[field]) {
      setValues(uniqueValuesCache[field]);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('crm_leads')
        .select(field)
        .not(field, 'is', null);

      if (searchTerm) {
        query = query.ilike(field, `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(2000); 

      if (!error && data) {
        const colDef = COLUMNS.find(c => c.key === field);
        const options = colDef?.options || [];
        
        const rawUnique = [...new Set(data.map(item => String(item[field]).toUpperCase().trim()))].filter(Boolean);

        // Helper to match broken data to correct labels
        const getCanonicalLabel = (val) => {
          const fuzzy = val.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
          
          // Hard fixes for the user's specific errors
          if (fuzzy === "HORSCIBLESALARIS") return "HORS CIBLE SALARIÉS";
          if (fuzzy === "HORSCIBLESIGE") return "HORS CIBLE SIÈGE";
          if (fuzzy === "OCCUP") return "OCCUPÉ";
          
          // Try to match against predefined options
          for (const opt of options) {
            const cleanOpt = opt.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
            if (fuzzy === cleanOpt) return opt;
          }
          return val;
        };

        const deduplicated = [];
        const seen = new Set();
        
        // Process DB values through canonical filter
        rawUnique.forEach(val => {
          const canonical = getCanonicalLabel(val);
          if (!seen.has(canonical)) {
            deduplicated.push(canonical);
            seen.add(canonical);
          }
        });

        const finalSorted = deduplicated.sort((a, b) => a.localeCompare(b));
        
        if (!searchTerm) {
          uniqueValuesCache[field] = finalSorted;
        }
        
        setValues(prev => {
          const merged = [...new Set([...prev, ...finalSorted])];
          return merged.sort((a, b) => a.localeCompare(b));
        });
      }
    } catch (err) {
      console.error("Error fetching unique values:", err);
    } finally {
      setLoading(false);
    }
  }, [field]);

  return { values, loading, fetchValues };
};

const ColumnFilterPortal = ({ field, label, activeValues, onApply, onClose, anchorRect }) => {
  const { values: allValues, loading, fetchValues } = useUniqueValues(field);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(activeValues || []);
  
  // Also include predefined options if available in COLUMNS for this field
  const colDef = COLUMNS.find(c => c.key === field);
  const combinedValues = useMemo(() => {
    const fromDB = allValues || [];
    const fromDef = (colDef?.options || []).map(o => String(o).toUpperCase().trim());
    const fromSelected = (selected || []).map(s => String(s).toUpperCase().trim());
    return [...new Set([...fromDB, ...fromDef, ...fromSelected])].sort((a, b) => a.localeCompare(b));
  }, [allValues, colDef, selected]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  // Server-side search debounce
  useEffect(() => {
    if (!searchTerm) return;
    const timer = setTimeout(() => {
      fetchValues(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchValues]);

  const filtered = combinedValues.filter(v => 
    String(v).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleToggle = (val) => setSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  const menuStyle = { position: 'fixed', top: anchorRect.bottom + 8, left: Math.min(anchorRect.left, window.innerWidth - 280), width: 260, zIndex: 9999 };
  return (
    <div style={menuStyle} className="bg-white rounded-2xl shadow-2xl border border-navy/10 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="p-4 border-b border-navy/5 bg-navy/[0.02]">
        <div className="flex items-center justify-between mb-3 text-[10px] font-black text-navy/40 uppercase tracking-widest">
          <span>Filtrer {label}</span>
          <div className="flex gap-3">
            <button onClick={() => setSelected(combinedValues)} className="text-primary hover:text-primary-dark transition-colors">Tous</button>
            <button onClick={() => setSelected([])} className="text-secondary hover:text-secondary-dark transition-colors">Aucun</button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy/30" />
          <input autoFocus type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-navy/10 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
        </div>
      </div>
      <div className="flex-1 max-h-64 overflow-y-auto custom-scrollbar p-2">
        {loading && combinedValues.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-navy/30"><RefreshCw className="w-5 h-5 animate-spin mb-2" /><span className="text-[10px] uppercase tracking-wider font-bold">Chargement...</span></div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-navy/30 text-[10px] uppercase font-bold tracking-widest">Aucun résultat</div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(val => (
              <button key={val} onClick={() => handleToggle(val)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-navy/5 transition-colors group text-left">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selected.includes(val) ? 'bg-primary border-primary' : 'bg-white border-navy/20 group-hover:border-navy/40'}`}>{selected.includes(val) && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}</div>
                <span className={`text-xs truncate ${selected.includes(val) ? 'text-navy font-bold' : 'text-navy/60'}`}>{val || '(Vide)'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 bg-navy/[0.02] border-t border-navy/5 flex gap-2">
        <button onClick={onClose} className="flex-1 px-4 py-2 text-[10px] font-black text-navy/40 uppercase tracking-widest hover:bg-navy/5 rounded-xl transition-all">Annuler</button>
        <button onClick={() => onApply(selected)} className="flex-1 px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all">Appliquer</button>
      </div>
    </div>
  );
};

const MondayTable = React.memo(({ activeTab, user }) => {
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Persistance des filtres et de la recherche
  const [search, setSearch] = useState(() => localStorage.getItem(`crm_search_${activeTab}`) || '');
  const [activeFilters, setActiveFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(`crm_filters_${activeTab}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [activePicker, setActivePicker] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [clickedRowId, setClickedRowId] = useState(null);
  const [filterMenu, setFilterMenu] = useState(null);
  const [error, setError] = useState(null);
  const lastFetchId = useRef(0);
  const initialScrollRestored = useRef(false);
  const [columns, setColumns] = useState(COLUMNS);
  const listRef = useRef(null);
  const pickerRef = useRef(null);
  const tableTotalWidth = useMemo(() => columns.reduce((acc, col) => acc + col.width, 0), [columns]);

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  const fetchColumnConfigs = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('crm_column_configs')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      let finalCols = [];
      if (data && data.length > 0) {
        finalCols = data.map(c => {
          const baseCol = COLUMNS.find(oc => oc.key === c.key);
          return {
            ...c,
            width: (c.key === 'tel' || c.key === 'mobile') ? 180 : (c.key === 'gerant' ? 300 : (c.width || baseCol?.width || 150)),
            label: c.label || baseCol?.label,
            type: c.type || baseCol?.type || 'text',
            options: c.options || baseCol?.options
          };
        });
      } else {
        const seedData = COLUMNS.map((c, i) => ({
          key: c.key,
          label: c.label,
          type: c.type || 'text',
          options: c.options || [],
          width: c.key === 'gerant' ? 300 : (c.width || 150),
          display_order: i,
          is_visible: true
        }));
        await supabase.from('crm_column_configs').insert(seedData);
        finalCols = COLUMNS;
      }

      // Handle Permissions and Dynamic Options
      const teamRes = await supabase.from('team_members').select('name, role').eq('is_active', true);
      const perms = user?.permissions;
      
      let filteredCols = [...finalCols];
      if (perms?.leads_columns && !perms.leads_columns.includes('all')) {
        filteredCols = filteredCols.filter(col => perms.leads_columns.includes(col.key));
      }

      if (!teamRes.error && teamRes.data) {
        const funboosters = teamRes.data.filter(m => m.role === 'funebooster').map(m => m.name.toUpperCase());
        const userRole = (user?.role || '').toLowerCase();
        const isFunbooster = userRole === 'funbooster' || userRole === 'funebooster';
        
        let commercialNames = [];
        if (userRole === 'admin') {
          commercialNames = teamRes.data.filter(m => m.role === 'commercial').map(m => m.name);
        } else if (isFunbooster) {
          const assigned = user?.permissions?.assigned_commercials || [];
          commercialNames = teamRes.data
            .filter(m => (m.role || '').toLowerCase() === 'commercial' && assigned.includes(m.name))
            .map(m => m.name);
        }

        filteredCols = filteredCols.map(col => {
          if (col.key === 'funebooster') return { ...col, options: [...new Set(funboosters)].sort() };
          if (col.key === 'opcosign') return { ...col, options: [...new Set(commercialNames)].sort(), type: 'select' };
          return col;
        });
      }

      setColumns(filteredCols);
    } catch (err) {
      console.error('Error fetching columns:', err);
    }
  }, [supabase, user]);

  useEffect(() => {
    fetchColumnConfigs();
  }, [fetchColumnConfigs]);

  const [enrichingId, setEnrichingId] = useState(null);

  const enrichLead = useCallback(async (id, siret) => {
    if (!siret || siret === '---') return;
    setEnrichingId(id);
    try {
      const cleanSiret = String(siret).replace(/[^0-9]/g, '');
      const siren = cleanSiret.substring(0, 9);
      
      let response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiret}`);
      let data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const updates = {};
        let foundGerant = "";
        let foundIdcc = "";
        
        if (result.dirigeants && result.dirigeants.length > 0) {
          const d = result.dirigeants[0];
          foundGerant = `${d.nom || ''} ${d.prenoms || ''}`.trim().toUpperCase();
        }

        const idccList = result.liste_idcc || 
                         (result.complements && result.complements.liste_idcc) ||
                         (result.siege && result.siege.liste_idcc) ||
                         (result.unite_legale && result.unite_legale.liste_idcc) ||
                         (result.matching_etablissements && result.matching_etablissements[0]?.liste_idcc);

        if (idccList && idccList.length > 0) {
          foundIdcc = String(idccList[0]).trim();
        }

        // Fallback to SIREN
        if (!foundIdcc) {
          const sirenResp = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}`);
          const sirenData = await sirenResp.json();
          if (sirenData.results && sirenData.results.length > 0) {
            const sResult = sirenData.results[0];
            const sIdccList = sResult.liste_idcc || (sResult.unite_legale && sResult.unite_legale.liste_idcc) || (sResult.complements && sResult.complements.liste_idcc);
            if (sIdccList && sIdccList.length > 0) {
              foundIdcc = String(sIdccList[0]).trim();
            }
          }
        }

        const lead = leads.find(l => l.id === id);
        if (foundGerant && (!lead.gerant || lead.gerant === '---')) updates.gerant = foundGerant;
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
          const { error } = await supabase.from('crm_leads').update(updates).eq('id', id);
          if (!error) {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
          }
        }
      }
    } catch (err) {
      console.error('Enrichment error:', err);
    }
    setEnrichingId(null);
  }, [leads]);

  const bulkEnrich = async () => {
    const targets = leads.filter(l => l.siret && l.siret !== '---' && (!l.gerant || (!l.idcc || l.idcc === '---')));
    if (targets.length === 0) return alert("Aucun lead à enrichir sur cette page.");
    
    const count = targets.length;
    const confirmed = window.confirm(`Voulez-vous enrichir automatiquement ${count} leads ?\n\nCela prendra environ ${Math.round(count * 0.6)} secondes pour respecter les limites de l'API.`);
    
    if (!confirmed) return;

    for (const lead of targets) {
      await enrichLead(lead.id, lead.siret);
      // Wait 300ms between requests to avoid 429 errors
      await new Promise(r => setTimeout(r, 300));
    }
    alert("Enrichissement en masse terminé !");
  };


  const fetchPage = useCallback(async (pageIndex, replace = false, searchQuery = '', filters = activeFilters) => {
    if (!supabase) return;
    const fetchId = ++lastFetchId.current;
    setError(null);
    if (pageIndex === 0) setLoading(true); else setLoadingMore(true);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from('crm_leads').select('*', { count: pageIndex === 0 ? 'exact' : 'estimated' });
    if (searchQuery) query = query.or(`nom_entreprise.ilike.%${searchQuery}%,siret.ilike.%${searchQuery}%,projet.ilike.%${searchQuery}%`);
    // Column Filters - Case-Insensitive + Wildcard matching to handle broken accents
    Object.entries(filters).forEach(([field, values]) => {
      if (values && values.length > 0) {
        // Replace non-ASCII (accents, broken ) with '%' wildcards to match all variations in DB
        const ilikeConditions = values.flatMap(v => {
          const safeVal = String(v).replace(/[^\x00-\x7F]/g, '%');
          
          // Special Case: NAF Code filter should check both 'code_naf' and 'secteur' columns
          if (field === 'code_naf') {
            return [
              `code_naf.ilike.${safeVal}`,
              `secteur.ilike.${safeVal}`
            ];
          }
          
          return [`${field}.ilike.${safeVal}`];
        }).join(',');
        
        query = query.or(ilikeConditions);
      }
    });
    if (activeTab === 'mes-rdv') {
      query = query.ilike('status', 'rdv');
      if (user?.role === 'commercial') {
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
        query = query.or(`opcosign.ilike."${user.name}",opcosign.is.null`);
      } else {
        query = query.ilike('funebooster', user?.name);
      }
    }
    else if (activeTab === 'mes-rappel') query = query.ilike('status', 'rappel').ilike('funebooster', user?.name);
    const { data, error: fetchError, count } = await query.order('date_modification', { ascending: false }).range(from, to);
    
    if (fetchId !== lastFetchId.current) return;

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      setError(fetchError.message);
    } else if (data) {
      if (pageIndex === 0 && count !== null) setTotalCount(count);
      setLeads(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false); setLoadingMore(false);
  }, [activeTab, user, activeFilters]);

  const handleApplyFilter = useCallback((field, values) => {
    const newFilters = { ...activeFilters, [field]: values };
    if (!values || values.length === 0) delete newFilters[field];
    setActiveFilters(newFilters);
    localStorage.setItem(`crm_filters_${activeTab}`, JSON.stringify(newFilters));
    setFilterMenu(null);
    setPage(0);
    fetchPage(0, true, search, newFilters);
  }, [activeFilters, fetchPage, search, activeTab]);

  // Sauvegarder la recherche
  useEffect(() => {
    localStorage.setItem(`crm_search_${activeTab}`, search);
  }, [search, activeTab]);

  // Restaurer le scroll après le chargement des données
  useEffect(() => {
    if (!loading && leads.length > 0 && !initialScrollRestored.current && listRef.current) {
      const savedScroll = localStorage.getItem(`crm_scroll_${activeTab}`);
      if (savedScroll) {
        setTimeout(() => {
          listRef.current?.scrollTo(parseFloat(savedScroll));
          initialScrollRestored.current = true;
        }, 100);
      } else {
        initialScrollRestored.current = true;
      }
    }
  }, [loading, leads.length, activeTab]);

  // Reset scroll restoration flag when tab changes
  useEffect(() => {
    initialScrollRestored.current = false;
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); fetchPage(0, true, search, activeFilters); }, search ? 500 : 0);
    return () => clearTimeout(timer);
  }, [search, fetchPage, activeTab, activeFilters]);

  // Realtime subscription with debounce to avoid excessive refreshes
  useEffect(() => {
    if (supabase) {
      let timeoutId;
      const ch = supabase
        .channel('crm_leads_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new;
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            // Only re-fetch for structural changes to avoid excessive jumping
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              fetchPage(0, true, search, activeFilters);
              setPage(0);
            }, 2000);
          }
        })
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
        clearTimeout(timeoutId);
      };
    }
  }, [fetchPage, search, activeTab, activeFilters]);

  const handleUpdate = useCallback(async (id, field, value, isCustom) => {
    const idStr = String(id).toLowerCase();
    const leadIndex = leads.findIndex(l => String(l.id).toLowerCase() === idStr);
    if (leadIndex === -1) return;
    const lead = leads[leadIndex];
    let dbValue = value === '' ? null : value;
    
    if (field === 'status' && dbValue) {
      dbValue = dbValue.toUpperCase();
      if (dbValue === 'RDV' && user?.role !== 'admin') dbValue = 'EN ATTENTE RDV';
    }
    
    if (field === 'heure_rdv' && dbValue) { 
      const parts = dbValue.split(/[:hH]/); 
      const h = parts[0]?.padStart(2, '0') || '00'; 
      const m = (parts[1] || '00').substring(0, 2).padStart(2, '0'); 
      dbValue = `${h}:${m}:00`; 
    }

    let updates = {};
    if (isCustom) {
      updates.custom_fields = { ...(lead.custom_fields || {}), [field]: dbValue };
    } else {
      updates[field] = dbValue;
      // Auto-trigger Nouveau for Pipeline when status is set to RDV
      if (field === 'status' && dbValue === 'RDV') {
        updates.status_rdv = 'Nouveau';
      }
    }
    updates.date_modification = new Date().toISOString();

    if (!isCustom && field === 'adresse' && value) { 
      const cpMatch = value.match(/\b\d{5}\b/); 
      if (cpMatch) { updates.code_postal = cpMatch[0]; updates.code_departement = cpMatch[0].substring(0, 2); } 
    }
    
    // IDCC is now a simple text field, no more auto-fill from here
    
    // Auto-fill Libellé d'activité à partir du Code NAF
    if (!isCustom && field === 'code_naf' && value) {
      const cleanNaf = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const description = nafMapping[cleanNaf];
      if (description) updates.libelle_activite = description;
    }
    
    if (!isCustom && (field === 'ca_signe_ht' || field === 'nb_heures_formation')) { 
      const ca = field === 'ca_signe_ht' ? parseFloat(value) : parseFloat(lead.ca_signe_ht); 
      const hrs = field === 'nb_heures_formation' ? parseFloat(value) : parseFloat(lead.nb_heures_formation); 
      if (ca && hrs && hrs !== 0) updates.tx_horaire_ca = (ca / hrs).toFixed(2); 
    }

    const updatedLead = { ...lead, ...updates };
    setLeads(prev => { const newList = [...prev]; newList[leadIndex] = updatedLead; return newList; });
    
    if (supabase) {
      await supabase.from('crm_leads').update(updates).eq('id', id);

      if (field === 'observation' && value) {
        await supabase.from('crm_observations_history').insert({ 
          lead_id: id, 
          observation_text: value, 
          created_by: user?.name || 'Inconnu' 
        });
      }
    }
  }, [leads, user]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, false, search, activeFilters);
  }, [page, fetchPage, search, activeFilters]);

  const itemData = useMemo(() => ({
    leads,
    columns,
    handleUpdate,
    activePicker,
    setActivePicker,
    pickerRef,
    onDoubleClick: setSelectedLeadId,
    clickedRowId,
    onClick: setClickedRowId,
    enrichLead,
    enrichingId
  }), [leads, columns, handleUpdate, activePicker, clickedRowId, enrichLead, enrichingId]);

  return (
    <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-700">
      <div className="flex items-center justify-between gap-4 flex-wrap px-1">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-navy/5 border border-navy/5 shadow-inner"><LayoutGrid className="w-5 h-5 text-navy" /></div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-navy leading-none mb-1">Inventaire Leads</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">{leads.length.toLocaleString()} chargés</span>
              <div className="w-1 h-1 rounded-full bg-navy/20" />
              {totalCount > 0 && <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{totalCount.toLocaleString()} au total</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onSearch={setSearch} />
          
          <button 
            onClick={bulkEnrich}
            disabled={enrichingId !== null}
            className={`p-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center group ${enrichingId === 'BULK' ? 'bg-primary text-white animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'}`}
            title="Enrichir tous les leads de la page"
          >
            <Wand2 className={`w-5 h-5 ${enrichingId !== null ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
          </button>
          

          <a href="https://quel-est-mon-opco.francecompetences.fr/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3.5 bg-navy text-white rounded-2xl text-sm font-bold hover:bg-navy/90 transition-all shadow-lg shadow-navy/10 group">Vérif OPCO<ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></a>
          
          {user?.role === 'admin' && (
            <button 
              onClick={() => setIsColumnModalOpen(true)} 
              className="p-3.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-2xl transition-all shadow-lg shadow-primary/5 hover:scale-105 active:scale-95"
              title="Gérer les colonnes"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
          
          <button 
            onClick={() => {
              fetchColumnConfigs();
              fetchPage(0, true);
            }} 
            className="p-3.5 bg-navy/5 text-navy/40 hover:text-navy rounded-2xl transition-all hover:rotate-180 duration-500"
            title="Tout rafraîchir"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="rounded-[2rem] border border-navy/5 shadow-2xl bg-white overflow-x-auto custom-scrollbar" style={{ height: 'calc(100vh - 180px)' }}>
        <div style={{ width: tableTotalWidth }}>
          <div className="sticky top-0 z-[60] flex items-center bg-[#f8f9ff] border-b border-navy/5 shadow-sm">
            {columns.map(col => {
              const isFilterable = FILTERABLE_COLUMNS.includes(col.key);
              const isActive = activeFilters[col.key]?.length > 0;
              return (
                <div key={col.key} style={{ width: col.width, minWidth: col.width }} className="flex-shrink-0 px-6 py-4 text-[11px] font-black text-navy/60 uppercase tracking-[0.15em] border-l border-navy/[0.03] flex items-center justify-between group">
                  <span className="break-words leading-tight pr-2">{col.label}</span>
                  {isFilterable && (
                    <button onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setFilterMenu({ field: col.key, label: col.label, anchorRect: rect }); }} className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-navy/20 hover:bg-navy/5 hover:text-navy/40'}`}>
                      <Filter className={`w-3 h-3 ${isActive ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {filterMenu && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setFilterMenu(null)} />
              <ColumnFilterPortal {...filterMenu} activeValues={activeFilters[filterMenu.field]} onApply={(values) => handleApplyFilter(filterMenu.field, values)} onClose={() => setFilterMenu(null)} />
            </>
          )}
          <div className="relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-4 border-navy/10 border-t-primary rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.3em]">Synchronisation en cours…</span>
              </div>
            ) : (leads.length === 0 || error) ? (
              <div className="flex flex-col items-center justify-center py-32 text-navy/20 animate-in fade-in duration-700">
                <div className="p-6 rounded-3xl bg-navy/5 mb-6">
                  {error ? <AlertCircle className="w-12 h-12 text-red-400" /> : <Mail className="w-12 h-12 opacity-40" />}
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest mb-2">
                  {error ? 'Erreur de chargement' : 'Aucune donnée'}
                </h3>
                <p className="text-xs font-bold text-navy/20 uppercase tracking-widest max-w-xs text-center leading-relaxed mb-6">
                  {error ? `Une erreur est survenue : ${error}` : "La requête n'a retourné aucun résultat pour ce filtre."}
                </p>
                <button 
                  onClick={() => fetchPage(0, true, search, activeFilters)}
                  className="flex items-center gap-2 px-6 py-3 bg-navy/5 text-navy hover:bg-navy hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Chargement...' : 'Réessayer'}
                </button>
              </div>
            ) : (
              <List
                ref={listRef}
                height={550}
                width={tableTotalWidth}
                itemCount={leads.length}
                itemSize={48}
                itemData={itemData}
                style={{ overflowY: 'auto', overflowX: 'hidden' }}
                onScroll={({ scrollOffset }) => {
                  // Sauvegarder le scroll avec un petit throttle pour la performance
                  if (scrollOffset > 0) {
                    localStorage.setItem(`crm_scroll_${activeTab}`, scrollOffset);
                  }
                }}
                onItemsRendered={({ visibleStopIndex }) => {
                  if (hasMore && !search && !loadingMore && visibleStopIndex >= leads.length - 10) {
                    loadMore();
                  }
                }}
              >
                {TableRow}
              </List>
            )}
          </div>
        </div>
      </div>
      {selectedLeadId && (
        <LeadDetailPanel 
          leadId={selectedLeadId} 
          lead={leads.find(l => l.id === selectedLeadId)} 
          onClose={() => setSelectedLeadId(null)} 
          userName={user?.name}
          permissions={user?.permissions}
          userRole={user?.role}
          onUpdate={(id, updates) => {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
          }}
        />
      )}

      <ColumnManagerModal 
        isOpen={isColumnModalOpen} 
        onClose={() => setIsColumnModalOpen(false)} 
        onRefresh={fetchColumnConfigs}
      />
    </div>
  );
});

export default MondayTable;
