import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import { 
  Search, Filter, ChevronDown, ChevronUp, RefreshCw, AlertCircle, 
  ExternalLink, Copy, Check, Clock, Phone, MapPin, Building2, User,
  Pencil, Trash2, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LeadFullDetail from './LeadFullDetail';

// Status colors and styles tailored for 2025 and 2026
const getStatusStyle = (raw, isDarkMode) => {
  const key = String(raw || '').toLowerCase().trim();
  
  const STATUS_COLORS = {
    // 2026 Statuses
    'a traiter':            { bg: isDarkMode ? '#1e293b' : '#f1f5f9', text: isDarkMode ? '#94a3b8' : '#64748b' }, 
    'absent':               { bg: '#64748b', text: '#fff' },
    'deja pec':             { bg: '#8b5cf6', text: '#fff' },
    'bloqué archive':       { bg: '#334155', text: '#cbd5e1' },
    'faux num':             { bg: '#dc2626', text: '#fff' },
    'hors cible':           { bg: '#374151', text: '#9ca3af' },
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
    'signé':                { bg: '#ff007f', text: '#fff' },
    'tns':                  { bg: '#c084fc', text: '#fff' },
    
    // 2025 Specific Statuses
    'rdv annulé':           { bg: '#7f1d1d', text: '#fecaca' },
    'non signé':            { bg: '#ef4444', text: '#fff' },
    'à relancer':           { bg: '#d97706', text: '#fff' },
    'à relancer n+1':       { bg: '#b45309', text: '#fef3c7' },
    'proposition':          { bg: '#3b82f6', text: '#fff' },
    'rdv confirmé':         { bg: '#10b981', text: '#fff' },
    'mail envoyé':          { bg: '#6366f1', text: '#fff' },
    'rap':                  { bg: '#a855f7', text: '#fff' },
    'plus de budget opco':  { bg: '#6b7280', text: '#fff' },
    'rap pour conf':        { bg: '#ec4899', text: '#fff' },
    'tel confirmé':         { bg: '#14b8a6', text: '#fff' },
    'rdv visio':            { bg: '#06b6d4', text: '#fff' },
    'pas de retour':        { bg: '#4b5563', text: '#fff' },
    'sign annulé':          { bg: '#991b1b', text: '#fee2e2' },
    'pas assez de budget':  { bg: '#6b7280', text: '#f3f4f6' },
    'visio confirmée':      { bg: '#0891b2', text: '#fff' },
    'rdv à confirmer':      { bg: '#facc15', text: '#451a03' },
    
    'default':              { bg: isDarkMode ? '#1a1a1a' : '#f1f5f9', text: isDarkMode ? '#64748b' : '#94a3b8' }
  };
  
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

const formatNaf = (val) => {
  if (!val) return val;
  const clean = String(val).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === 5) {
    return `${clean.substring(0, 2)}.${clean.substring(2, 4)}${clean.substring(4)}`;
  }
  if (clean.length === 4) {
    return `${clean.substring(0, 2)}.${clean.substring(2)}`;
  }
  return val;
};

const isLeadLocked = (lead, user) => {
  if (!lead || !user) return false;
  
  const userRole = String(user.role || '').toLowerCase().trim();
  const isAdmin = userRole === 'admin';
  const isCommercial = userRole === 'commercial';
  
  // Non-admins cannot edit if the lead is in BLOQUÉ ARCHIVE status
  const status2026 = String(lead.statut_2026 || '').toUpperCase().trim();
  if (status2026 === 'BLOQUÉ ARCHIVE' && !isAdmin) return true;

  if (isAdmin || isCommercial) return false;

  // For Funboosters, lock if status is RDV, SIGNE, or EN ATTENTE RDV
  const lockedStatuses = ['RDV', 'SIGNE', 'EN ATTENTE RDV'];
  return lockedStatuses.includes(status2026);
};

const COLUMNS = [
  { label: 'Année Act.',   key: 'annee_act',         width: 130, type: 'number' },
  { label: 'Funbooster',   key: 'funebooster',       width: 160, type: 'select', options: [
    'BENZAYDOUNE', 'LABIBA', 'MERYEM', 'SOUKAINA', 'WISSAL', 'AMRI', 'KHADIJA', 'WIJDAN', 'GHITA'
  ]},
  { label: 'Entreprise',   key: 'nom_entreprise',    width: 240, bold: true },
  { label: 'Nº Siret',     key: 'siret',             width: 200, mono: true },
  { label: 'Téléphone',    key: 'tel',               width: 180, type: 'editable' },
  { label: 'Mobile',       key: 'mobile',            width: 180, type: 'editable' },
  { label: 'Statut 2026',  key: 'statut_2026',       width: 180, type: 'select', options: [
    'A TRAITER', 'BLOQUÉ ARCHIVE', 'PAS DE NUM', 'REPONDEUR', 'OCCUPÉ', 'EN ATTENTE RDV', 'RDV', 'SIGNE', 'RAPPEL', 'NRP', 
    'HORS CIBLE OPCO', 'HORS CIBLE SALARIÉS', 'HORS CIBLE SIÈGE', 'DEJA PEC', 'ABSENT', 'PI', 'FAUX NUM'
  ]},
  { label: 'Statut 2025',  key: 'statut_2025',       width: 180, type: 'select', options: [
    'A TRAITER', 'BLOQUÉ ARCHIVE', 'RDV ANNULÉ', 'NON SIGNÉ', 'À RELANCER', 'À RELANCER N+1', 
    'PROPOSITION', 'RDV CONFIRMÉ', 'MAIL ENVOYÉ', 'RAP', 'PLUS DE BUDGET OPCO', 
    'RAP POUR CONF', 'TEL CONFIRMÉ', 'RDV VISIO', 'PAS DE RETOUR', 'SIGN ANNULÉ', 
    'PAS ASSEZ DE BUDGET', 'VISIO CONFIRMÉE', 'RDV À CONFIRMER', 'TNS', 'REPONDEUR', 'NRP', 'OCCUPÉ'
  ]},
  { label: 'Opco',         key: 'nom_opco',          width: 150, type: 'select', options: [
    'OPCOMMERCE', 'OPCO EP', 'OPCO AKTO', 'OPCO ATLAS', 'AFDAS', 'CONSTRUCTYS', 
    'MOBILITÉ', 'OPCO 2i', 'UNIFORMATION', 'OPCO SANTÉ', 'OCAPIAT'
  ]},
  { label: 'Client OF',    key: 'client_of',         width: 180, type: 'select', options: [
    'CA CONSEILS', 'TB FORMATIONS', 'GO CONSEILS', 'IT PERFORMANCE', 'HORS ZONE'
  ]},
  { label: 'Opcosign',     key: 'opcosign',          width: 180, type: 'select', options: [
    'MAXIME', 'FABIEN', 'REDA', 'SOUKAINA', 'ELISA', 'WIAM', 'WIJDAN'
  ]},
  { label: 'Gérant',       key: 'gerant',            width: 300, type: 'editable' },
  { label: 'Libellé Act.', key: 'libelle_activite',  width: 200 },
  { label: 'Code NAF',     key: 'code_naf',          width: 130 },
  { label: 'Pappers',      key: 'pappers',           width: 130, type: 'pappers' },
  { label: 'Adresse',      key: 'adresse',           width: 260 }
];

const PAGE_SIZE = 50;

const CustomSelect = React.memo(({ value, options, onChange, colorCfg, isDarkMode, disabled }) => {
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
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if (disabled) return; if (!isOpen) setRect(containerRef.current.getBoundingClientRect()); setIsOpen(!isOpen); }}
        style={{ backgroundColor: colorCfg.bg, color: colorCfg.text }}
        className={`w-full pl-2 pr-5 py-1.5 rounded-lg font-black uppercase tracking-tight flex items-center justify-between shadow-sm group/btn transition-all ${disabled ? 'cursor-not-allowed opacity-50' : 'active:scale-[0.98]'} min-h-[28px] relative overflow-hidden`}
      >
        <span className={`whitespace-nowrap leading-none ${value && value.length > 10 ? 'text-[8.5px]' : 'text-[10px]'}`}>{value || 'CHOISIR'}</span>
        <div className="flex-shrink-0 ml-1 opacity-40 group-hover/btn:opacity-100 transition-all">
          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <DropdownPortal targetRect={rect}>
          <div ref={dropdownRef} className="absolute top-0 left-0 w-full min-w-[200px] z-[9999] bg-card border border-navy/10 rounded-2xl shadow-[0_20px_50px_rgba(14,27,77,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top" onClick={(e) => e.stopPropagation()}>
            <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
              <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(''); setIsOpen(false); }} className="w-full px-4 py-1.5 text-left text-[9px] font-black text-navy/30 hover:bg-navy/5 hover:text-navy uppercase tracking-[0.2em] transition-colors">— RÉINITIALISER —</button>
              <div className="h-px bg-navy/5 mx-2 my-1" />
              {options.filter(opt => {
                const parts = opt.split('::');
                const label = parts[0];
                const isHidden = parts[2] === 'h';
                return !isHidden || label === value;
              }).map((opt) => {
                const label = opt.split('::')[0];
                const cfg = getStatusStyle(label, isDarkMode);
                return (
                  <button 
                    key={opt} 
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(label); setIsOpen(false); }} 
                    className={`w-full px-4 py-1.5 text-left text-[11px] font-bold transition-all flex items-center justify-between group/opt ${value === label ? 'bg-active text-white' : 'text-navy/70 hover:bg-navy/5 hover:text-navy'}`}
                  >
                    <span 
                      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter"
                      style={{ backgroundColor: cfg.bg, color: cfg.text }}
                    >
                      {label}
                    </span>
                    {value === label && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </button>
                );
              })}
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

const TableCell = React.memo(({ lead, col, handleUpdate, user, isDarkMode }) => {
  const [copied, setCopied] = useState(false);
  const [localEdit, setLocalEdit] = useState(false);
  
  const isLocked = isLeadLocked(lead, user);
  const raw = lead[col.key] || '';
  
  let displayRaw = raw || '';
  if (col.key === 'code_naf' && displayRaw) {
    displayRaw = formatNaf(displayRaw);
  }

  if (col.key === 'nom_entreprise') {
    return (
      <div className="flex items-center gap-2 group/ent min-w-0 pr-2">
        <span className="truncate block text-sm text-navy font-bold" title={displayRaw}>{displayRaw}</span>
      </div>
    );
  }

  if (col.key === 'siret' && raw) {
    return (
      <div className="flex items-center gap-2 group/siret min-w-0 pr-2">
        <span className="text-xs font-bold text-navy/90 font-mono tracking-tighter whitespace-nowrap">{raw}</span>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            navigator.clipboard.writeText(raw); 
            setCopied(true); 
            setTimeout(() => setCopied(false), 2000); 
          }} 
          title="Copier le SIRET" 
          className="p-1 hover:bg-navy/5 rounded-md transition-all opacity-0 group-hover/siret:opacity-100 flex-shrink-0 hover:scale-110 active:scale-95"
        >
          {copied ? <Check className="w-3 h-3 text-green-500 animate-in zoom-in duration-200" /> : <Copy className="w-3 h-3 text-navy/20 hover:text-navy/50 transition-colors" />}
        </button>
      </div>
    );
  }

  if (col.type === 'select' || col.type === 'status') {
    const cfg = getStatusStyle(raw, isDarkMode);
    return <CustomSelect value={raw} options={col.options} onChange={(val) => handleUpdate(lead.id, col.key, val, col.is_custom)} colorCfg={cfg} isDarkMode={isDarkMode} disabled={isLocked} />;
  }

  if (col.key === 'pappers') {
    const slug = slugify(lead.nom_entreprise || '');
    const siren = (lead.siret || '').substring(0, 9);
    const url = `https://www.pappers.fr/entreprise/${slug}-${siren}`;
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-center w-full gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-bold uppercase tracking-wider transition-all group shadow-sm active:scale-95"
        onClick={(e) => e.stopPropagation()}
      >
        Pappers
        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>
    );
  }

  if (col.type === 'editable' || col.key === 'tel' || col.key === 'mobile' || col.key === 'gerant') {
    const isPhone = col.key === 'tel' || col.key === 'mobile';
    
    if (isPhone && !localEdit) {
      return (
        <div className="flex items-center justify-between group/tel w-full px-2 py-1.5">
          <span className="text-sm text-navy/60 whitespace-nowrap">
            {displayRaw || '—'}
          </span>
          {!isLocked && (
            <button 
              onClick={(e) => { e.stopPropagation(); setLocalEdit(true); }}
              className="p-1 hover:bg-navy/5 rounded-md transition-all opacity-0 group-hover/tel:opacity-100 text-navy/20 hover:text-navy/50"
              title="Modifier"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    return (
      <input 
        type="text" 
        autoFocus={localEdit}
        key={`${lead.id}-${col.key}-${displayRaw}`} 
        defaultValue={displayRaw || ''} 
        disabled={isLocked}
        onBlur={e => {
          setLocalEdit(false);
          if (e.target.value !== (displayRaw || '')) {
            handleUpdate(lead.id, col.key, e.target.value, col.is_custom);
          }
        }} 
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
        className={`w-full px-2 py-1.5 bg-transparent border border-transparent rounded-lg text-sm transition-all placeholder:text-navy/20 ${isLocked ? 'cursor-not-allowed text-navy/40' : 'hover:bg-card hover:border-navy/10 focus:bg-card focus:border-primary focus:outline-none text-navy/60 focus:text-navy'}`}
        placeholder="—" 
      />
    );
  }

  if (col.type === 'number') {
    return (
      <input 
        type="number" 
        disabled={isLocked} 
        defaultValue={raw || ''} 
        onBlur={e => e.target.value !== String(raw || '') && handleUpdate(lead.id, col.key, e.target.value, col.is_custom)} 
        className={`w-full px-2 py-1.5 bg-transparent border border-transparent rounded-lg text-sm transition-all placeholder:text-navy/20 ${isLocked ? 'cursor-not-allowed text-navy/40' : 'hover:bg-card hover:border-navy/10 focus:bg-card focus:border-primary focus:outline-none text-navy/60 focus:text-navy'}`} 
        placeholder="—" 
      />
    );
  }

  return (
    <span 
      className={[
        col.mono ? 'font-mono tracking-tighter text-navy/90 text-xs' : 'text-sm text-navy/70',
        'truncate block'
      ].join(' ')} 
      title={displayRaw || ''}
    >
      {displayRaw || '—'}
    </span>
  );
});

const TableRow = React.memo(({ data, index, style }) => {
  const { leads, columns, clickedRowId, onClick, onDoubleClick, handleUpdate, user, isDarkMode } = data;
  const lead = leads[index];
  const isClicked = clickedRowId === lead.id;

  return (
    <div 
      style={style} 
      className={`flex items-center hover:bg-primary/10 transition-colors group/row cursor-pointer ${isClicked ? 'bg-primary/20' : ''}`}
      onClick={() => onClick(lead.id)}
      onDoubleClick={() => onDoubleClick && onDoubleClick(lead.id)}
    >
      {columns.map(col => (
        <div 
          key={col.key} 
          style={{ width: col.width, minWidth: col.width }} 
          className="flex-shrink-0 px-6 py-3 border-l border-navy/[0.02] overflow-hidden"
        >
          <TableCell lead={lead} col={col} handleUpdate={handleUpdate} user={user} isDarkMode={isDarkMode} />
        </div>
      ))}
    </div>
  );
});

const FILTERABLE_COLUMNS = ['funebooster', 'nom_opco', 'client_of', 'statut_2025', 'statut_2026'];
const uniqueValuesCache = {};

// Custom hook to fetch distinct filter values for the LEADS 2025 table
const useUniqueValues = (field) => {
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchValues = useCallback(async () => {
    if (uniqueValuesCache[field]) {
      setValues(uniqueValuesCache[field]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_leads_2025')
        .select(field)
        .not(field, 'is', null);

      if (!error && data) {
        const rawUnique = [...new Set(data.map(item => String(item[field]).toUpperCase().trim()))].filter(Boolean);
        const sorted = rawUnique.sort((a, b) => a.localeCompare(b));
        uniqueValuesCache[field] = sorted;
        setValues(sorted);
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
  const { values, loading, fetchValues } = useUniqueValues(field);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(activeValues || []);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const filtered = values.filter(v => 
    String(v).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleToggle = (val) => setSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  const menuStyle = { position: 'fixed', top: anchorRect.bottom + 8, left: Math.min(anchorRect.left, window.innerWidth - 280), width: 260, zIndex: 9999 };
  
  return (
    <div style={menuStyle} className="bg-card rounded-2xl shadow-2xl border border-navy/10 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="p-4 border-b border-navy/5 bg-navy/[0.02]">
        <div className="flex items-center justify-between mb-3 text-[10px] font-black text-navy/40 uppercase tracking-widest">
          <span>Filtrer {label}</span>
          <div className="flex gap-3">
            <button onClick={() => setSelected(values)} className="text-primary hover:text-primary-dark transition-colors">Tous</button>
            <button onClick={() => setSelected([])} className="text-secondary hover:text-secondary-dark transition-colors">Aucun</button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy/30" />
          <input autoFocus type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-card border border-navy/10 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
        </div>
      </div>
      <div className="flex-1 max-h-64 overflow-y-auto custom-scrollbar p-2">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-navy/30"><RefreshCw className="w-5 h-5 animate-spin mb-2" /><span className="text-[10px] uppercase tracking-wider font-bold">Chargement...</span></div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-navy/30 text-[10px] uppercase font-bold tracking-widest">Aucun résultat</div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(val => (
              <button key={val} onClick={() => handleToggle(val)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-navy/5 transition-colors group text-left">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selected.includes(val) ? 'bg-primary border-primary' : 'bg-card border-navy/20 group-hover:border-navy/40'}`}>{selected.includes(val) && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}</div>
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

const SearchInput = React.memo(({ value, onSearch }) => {
  const [localValue, setLocalValue] = useState(value);
  const externalValue = useRef(value);

  useEffect(() => {
    externalValue.current = value;
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== externalValue.current) {
        onSearch(localValue);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localValue, onSearch]);

  return (
    <div className="relative group">
      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy/20 group-focus-within:text-primary transition-colors" />
      <input
        type="text"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        placeholder="Rechercher entreprise, SIRET..."
        className="pl-11 pr-5 py-3.5 bg-card border border-navy/10 rounded-2xl text-sm text-navy placeholder:text-navy/20 focus:outline-none focus:ring-4 focus:ring-primary/5 w-80 transition-all shadow-sm"
      />
    </div>
  );
});

const Leads2025Table = ({ user, isDarkMode }) => {
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [search, setSearch] = useState(() => localStorage.getItem('crm_search_leads_2025') || '');
  const [activeFilters, setActiveFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_filters_leads_2025');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [clickedRowId, setClickedRowId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [filterMenu, setFilterMenu] = useState(null);
  const [error, setError] = useState(null);
  const lastFetchId = useRef(0);
  const listRef = useRef(null);

  const columns = useMemo(() => {
    return [...COLUMNS];
  }, []);
  const tableTotalWidth = useMemo(() => columns.reduce((acc, col) => acc + col.width, 0), [columns]);

  const fetchPage = useCallback(async (pageIndex, replace = false, searchQuery = '', filters = activeFilters) => {
    if (!supabase) return;
    const fetchId = ++lastFetchId.current;
    setError(null);
    if (pageIndex === 0) setLoading(true); else setLoadingMore(true);

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let query = supabase.from('crm_leads_2025').select('*', { count: pageIndex === 0 ? 'exact' : 'estimated' });

      // Search Query filter
      if (searchQuery) {
        query = query.or(`nom_entreprise.ilike.%${searchQuery}%,siret.ilike.%${searchQuery}%`);
      }

      // Column Filters
      Object.entries(filters).forEach(([field, values]) => {
        if (values && values.length > 0) {
          const ilikeConditions = values.map(v => {
            const safeVal = String(v).replace(/[^\x00-\x7F]/g, '%');
            return `${field}.ilike.${safeVal}`;
          }).join(',');
          query = query.or(ilikeConditions);
        }
      });

      // Query database ordered by modification and name
      const { data, error: fetchError, count } = await query
        .order('nom_entreprise', { ascending: true })
        .range(from, to);

      if (fetchId !== lastFetchId.current) return;

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        if (pageIndex === 0 && count !== null) setTotalCount(count);
        setLeads(prev => replace ? data : [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Error fetching 2025 leads:', err);
      setError(err.message);
    } finally {
      if (fetchId === lastFetchId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeFilters]);

  const handleUpdate = useCallback(async (id, field, value, isCustom) => {
    const idStr = String(id).toLowerCase();
    const leadIndex = leads.findIndex(l => String(l.id).toLowerCase() === idStr);
    if (leadIndex === -1) return;
    const lead = leads[leadIndex];
    let dbValue = value === '' ? null : value;

    // RESTRICTION: Non-admins cannot edit if the lead has a locked status (like BLOQUÉ ARCHIVE)
    const leadStatus = String(lead.statut_2026 || '').toUpperCase().trim();
    if (leadStatus === 'BLOQUÉ ARCHIVE' && user?.role !== 'admin') {
      alert("Cette fiche est verrouillée (BLOQUÉ ARCHIVE). Seul un administrateur peut y apporter des modifications.");
      return;
    }

    try {
      let updates = { [field]: dbValue };

      // WORKFLOW: If field is statut_2026 and value is 'RDV' or 'EN ATTENTE RDV'
      if (field === 'statut_2026' && (dbValue === 'RDV' || dbValue === 'EN ATTENTE RDV')) {
        updates.statut_2026 = 'EN ATTENTE RDV';
        
        // Check/Insert into active crm_leads table
        const cleanSiret = String(lead.siret || '').replace(/\s+/g, '');
        if (cleanSiret) {
          const { data: existingLead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('siret', lead.siret)
            .maybeSingle();

          if (existingLead) {
            const { error: updErr } = await supabase
              .from('crm_leads')
              .update({
                status: 'EN ATTENTE RDV',
                date_modification: new Date().toISOString()
              })
              .eq('id', existingLead.id);
            if (updErr) {
              console.error("Erreur Update crm_leads:", updErr);
              alert("Erreur lors de l'envoi en Zone Tampon: " + updErr.message);
              return;
            }
          } else {
            const { error: insErr } = await supabase
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
                nb_salaries: lead.nb_salaries === '' ? null : lead.nb_salaries,
                nb_apprentis: lead.nb_apprentis === '' ? null : lead.nb_apprentis,
                annee_budget: lead.annee_act === '' ? null : lead.annee_act,
                status: 'EN ATTENTE RDV',
                funebooster: lead.funebooster || user?.name || 'Système',
                date_modification: new Date().toISOString()
              }]);
            if (insErr) {
              console.error("Erreur Insert crm_leads:", insErr);
              alert("Erreur lors de l'envoi en Zone Tampon: " + insErr.message);
              return;
            }
          }
          alert("Le RDV a été envoyé à la Zone Tampon pour validation !");
        }
      }

      // Update database
      const { error } = await supabase
        .from('crm_leads_2025')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update state
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    } catch (err) {
      console.error("Error updating lead 2025:", err);
      alert("Erreur lors de la modification : " + err.message);
    }
  }, [leads, user]);

  const handleApplyFilter = useCallback((field, values) => {
    const newFilters = { ...activeFilters, [field]: values };
    if (!values || values.length === 0) delete newFilters[field];
    setActiveFilters(newFilters);
    localStorage.setItem('crm_filters_leads_2025', JSON.stringify(newFilters));
    setFilterMenu(null);
    setPage(0);
    fetchPage(0, true, search, newFilters);
  }, [activeFilters, fetchPage, search]);

  useEffect(() => {
    localStorage.setItem('crm_search_leads_2025', search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); fetchPage(0, true, search, activeFilters); }, search ? 500 : 0);
    return () => clearTimeout(timer);
  }, [search, fetchPage, activeFilters]);

  // Realtime subscription to detect automated status updates from the trigger!
  useEffect(() => {
    if (supabase) {
      const ch = supabase
        .channel('crm_leads_2025_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads_2025' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old;
            setLeads(prev => prev.filter(l => l.id !== deleted.id));
          }
        })
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
      };
    }
  }, []);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, false, search, activeFilters);
  }, [page, fetchPage, search, activeFilters]);

  const handleRowDoubleClick = useCallback((id) => {
    setSelectedLeadId(id);
  }, []);

  const itemData = useMemo(() => ({
    leads,
    columns,
    clickedRowId,
    onClick: setClickedRowId,
    onDoubleClick: handleRowDoubleClick,
    handleUpdate,
    user,
    isDarkMode
  }), [leads, columns, clickedRowId, setClickedRowId, handleRowDoubleClick, handleUpdate, user, isDarkMode]);

  return (
    <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-700">
      {/* Table Header Section */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-1">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/5 shadow-inner">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-navy leading-none mb-1">Leads Archives 2025</span>
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
            onClick={() => {
              fetchPage(0, true);
              setPage(0);
            }} 
            className="p-3.5 bg-navy/5 text-navy/40 hover:text-navy rounded-2xl transition-all hover:rotate-180 duration-500"
            title="Rafraîchir"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="rounded-[2rem] border border-navy/5 shadow-2xl bg-card overflow-x-auto custom-scrollbar" style={{ height: 'calc(100vh - 200px)' }}>
        <div style={{ width: tableTotalWidth }}>
          {/* Header Row */}
          <div className="sticky top-0 z-[60] flex items-center bg-background border-b border-navy/5 shadow-sm">
            {columns.map(col => {
              const isFilterable = FILTERABLE_COLUMNS.includes(col.key);
              const isActive = activeFilters[col.key]?.length > 0;
              return (
                <div 
                  key={col.key} 
                  style={{ width: col.width, minWidth: col.width }} 
                  className="flex-shrink-0 px-6 py-4 text-[11px] font-black text-navy/60 uppercase tracking-[0.15em] border-l border-navy/[0.03] flex items-center justify-between group"
                >
                  <span className="break-words leading-tight">{col.label}</span>
                  {isFilterable && (
                    <button 
                      onClick={(e) => { 
                        const rect = e.currentTarget.getBoundingClientRect(); 
                        setFilterMenu({ field: col.key, label: col.label, anchorRect: rect }); 
                      }} 
                      className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-navy/20 hover:bg-navy/5 hover:text-navy/40'}`}
                    >
                      <Filter className={`w-3 h-3 ${isActive ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Column Filters Dropdown */}
          {filterMenu && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setFilterMenu(null)} />
              <ColumnFilterPortal 
                {...filterMenu} 
                activeValues={activeFilters[filterMenu.field]} 
                onApply={(values) => handleApplyFilter(filterMenu.field, values)} 
                onClose={() => setFilterMenu(null)} 
              />
            </>
          )}

          {/* Table Data */}
          <div className="relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-4 border-navy/10 border-t-primary rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.3em]">Chargement des archives…</span>
              </div>
            ) : (leads.length === 0 || error) ? (
              <div className="flex flex-col items-center justify-center py-32 text-navy/20 animate-in fade-in duration-700">
                <div className="p-6 rounded-3xl bg-navy/5 mb-6">
                  {error ? <AlertCircle className="w-12 h-12 text-red-400" /> : <Building2 className="w-12 h-12 opacity-40" />}
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest mb-2">
                  {error ? 'Erreur de chargement' : 'Aucune donnée'}
                </h3>
                <p className="text-xs font-bold text-navy/20 uppercase tracking-widest max-w-xs text-center leading-relaxed mb-6">
                  {error ? `Une erreur est survenue : ${error}` : "Aucune entreprise trouvée pour ces filtres."}
                </p>
                <button 
                  onClick={() => fetchPage(0, true, search, activeFilters)}
                  className="flex items-center gap-2 px-6 py-3 bg-navy/5 text-navy hover:bg-navy hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Réessayer
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
        <LeadFullDetail 
          leadId={selectedLeadId}
          leads={leads}
          columns={columns}
          onClose={() => setSelectedLeadId(null)}
          user={user}
          permissions={user?.permissions}
          onUpdate={(id, updatedFields) => {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedFields } : l));
          }}
          isDarkMode={isDarkMode}
          tableName="crm_leads_2025"
        />
      )}
    </div>
  );
};

export default Leads2025Table;
