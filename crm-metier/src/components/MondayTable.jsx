import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Filter, Clock, ChevronDown, Loader2, ExternalLink, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  { label: 'ID',           key: 'lead_id',           width: 100, mono: true },
  { label: 'Funbooster',   key: 'funebooster',       width: 130 },
  { label: 'Entreprise',   key: 'nom_entreprise',    width: 240, bold: true },
  { label: 'Gérant',       key: 'gerant',            width: 150, type: 'editable' },
  { label: 'Nº Siret',     key: 'siret',             width: 170, mono: true },
  { label: 'Secteur Act.',  key: 'secteur_activite',  width: 180, type: 'editable' },
  { label: 'Libellé Act.',  key: 'libelle_activite',  width: 200, type: 'editable' },
  { label: 'Opco',         key: 'nom_opco',          width: 150 },
  { label: 'IDCC',         key: 'idcc',              width: 100, type: 'editable' },
  { label: 'Code NAF',     key: 'code_naf',          width: 100 },
  { label: 'Téléphone',    key: 'tel',               width: 140 },
  { label: 'Mobile',       key: 'mobile',            width: 140, type: 'editable' },
  { label: 'Adresse',      key: 'adresse',           width: 260, type: 'editable' },
  { label: 'Code Postal',  key: 'code_postal',       width: 100, type: 'auto' },
  { label: 'Code Dépt.',   key: 'code_departement',  width: 100, type: 'auto' },
  { label: 'Statut',       key: 'status',            width: 140, type: 'status' },
  { label: 'E-mail',       key: 'email',             width: 200, type: 'editable' },
  { label: 'Site Web',     key: 'site_web',          width: 180, type: 'editable' },
  { label: 'Statut Gérant', key: 'statut_gerant',     width: 150, type: 'select', options: ['TNS', '2 TNS', 'GÉRANT SALARIÉ', '2 GÉRANTS SALARIÉS'] },
  { label: 'Nb Salariés',  key: 'nb_salaries',       width: 100, type: 'number' },
  { label: 'Nb Apprentis', key: 'nb_apprentis',      width: 110, type: 'number' },
  { label: 'Date Modif',   key: 'date_modification', width: 150, type: 'date' },
  { label: 'Client OF',    key: 'client_of',         width: 120 },
  { label: 'Opcosign',     key: 'opcosign',          width: 130, type: 'editable' },
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
  { label: 'PEC',          key: 'pec',               width: 100, type: 'select', options: ['OUI', 'NON'] },
  { label: 'Échéances PEC', key: 'echeances_pec',     width: 200, type: 'pec_dates' },
  { label: 'Suivi Form.',  key: 'suivi_formation',   width: 150, type: 'select', options: ['PLANIFIÉE', 'ORGANISÉE', 'EN COURS', 'TERMINÉE'] },
  { label: 'Commentaires', key: 'observation',       width: 260, type: 'editable' },
  { label: 'Pappers',      key: 'pappers',           width: 110, type: 'pappers' },
];

const PAGE_SIZE = 500; // rows per page fetch

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const MondayTable = ({ activeTab, user }) => {
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [activePicker, setActivePicker] = useState(null); // { id, field }
  const pickerRef = useRef(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setActivePicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial fetch + count
  const fetchPage = useCallback(async (pageIndex, replace = false, searchQuery = '') => {
    if (!supabase) return;
    if (pageIndex === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('crm_leads')
      .select('*', { count: pageIndex === 0 ? 'exact' : 'estimated' });

    if (searchQuery) {
      // Filter by name, siret, or project
      query = query.or(`nom_entreprise.ilike.%${searchQuery}%,siret.ilike.%${searchQuery}%,projet.ilike.%${searchQuery}%`);
    }

    // Role-based and View-based filtering
    if (activeTab === 'mes-rdv') {
      query = query.ilike('status', 'rdv').ilike('funebooster', user?.name);
    } else if (activeTab === 'mes-rappel') {
      query = query.ilike('status', 'rappel').ilike('funebooster', user?.name);
    }
    // Note: 'leads' tab has no funebooster filter as requested (everyone sees everything)

    const { data, error, count } = await query
      .order('date_modification', { ascending: false })
      .range(from, to);

    if (!error && data) {
      if (pageIndex === 0 && count !== null) setTotalCount(count);
      setLeads(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [activeTab, user]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchPage(0, true, search);
    }, search ? 500 : 0); // No delay for initial load or clear

    return () => clearTimeout(timer);
  }, [search, fetchPage, activeTab]);

  // Realtime subscription
  useEffect(() => {
    if (supabase) {
      const ch = supabase
        .channel('crm_leads_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
          fetchPage(0, true, search);
          setPage(0);
        })
        .subscribe();
      return () => supabase.removeChannel(ch);
    }
  }, [fetchPage, search, activeTab]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, false, search);
  };

  const handleUpdate = async (id, field, value) => {
    // Lead object to update
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    let updates = { [field]: value, date_modification: new Date().toISOString() };

    // Automatic extractions
    if (field === 'adresse' && value) {
      const cpMatch = value.match(/\b\d{5}\b/);
      if (cpMatch) {
        updates.code_postal = cpMatch[0];
        updates.code_departement = cpMatch[0].substring(0, 2);
      }
    }

    // Automatic calculations
    if (field === 'ca_signe_ht' || field === 'nb_heures_formation') {
      const ca = field === 'ca_signe_ht' ? parseFloat(value) : parseFloat(lead.ca_signe_ht);
      const hrs = field === 'nb_heures_formation' ? parseFloat(value) : parseFloat(lead.nb_heures_formation);
      if (ca && hrs && hrs !== 0) {
        updates.tx_horaire_ca = (ca / hrs).toFixed(2);
      }
    }

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

    if (supabase) {
      await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', id);
    }
  };

  const filtered = useMemo(() => {
    return leads;
  }, [leads]);

  const renderCell = (lead, col) => {
    const raw = lead[col.key];

    if (col.type === 'status') {
      const cfg = getStatusStyle(raw);
      return (
        <span
          style={{ background: cfg.bg, color: cfg.text }}
          className="inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide whitespace-nowrap"
        >
          {raw || '—'}
        </span>
      );
    }

    if (col.type === 'date') {
      return (
        <span className="flex items-center gap-1.5 text-navy/40 text-xs whitespace-nowrap">
          <Clock className="w-3 h-3 flex-shrink-0" />
          {formatDate(raw)}
        </span>
      );
    }

    if (col.type === 'pappers') {
      const slug = slugify(lead.nom_entreprise || '');
      const siren = (lead.siret || '').substring(0, 9);
      const url = `https://www.pappers.fr/entreprise/${slug}-${siren}`;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-[10px] font-bold uppercase tracking-wider transition-all group"
          onClick={(e) => e.stopPropagation()}
        >
          Pappers
          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      );
    }

    if (col.type === 'editable') {
      return (
        <input
          type="text"
          defaultValue={raw || ''}
          onBlur={e => e.target.value !== (raw || '') && handleUpdate(lead.id, col.key, e.target.value)}
          className="w-full bg-transparent text-navy/60 text-sm focus:text-navy focus:outline-none placeholder:text-navy/20"
          placeholder="—"
        />
      );
    }

    if (col.type === 'number') {
      return (
        <input
          type="number"
          defaultValue={raw || ''}
          onBlur={e => e.target.value !== String(raw || '') && handleUpdate(lead.id, col.key, e.target.value)}
          className="w-full bg-transparent text-navy/60 text-sm focus:text-navy focus:outline-none placeholder:text-navy/20"
          placeholder="0"
        />
      );
    }

    if (col.type === 'currency' || col.type === 'auto_currency') {
      const isAuto = col.type === 'auto_currency';
      let displayValue = raw;

      // Fallback for auto calculation if empty
      if (isAuto && !displayValue && lead.ca_signe_ht && lead.nb_heures_formation) {
        const ca = parseFloat(lead.ca_signe_ht);
        const hrs = parseFloat(lead.nb_heures_formation);
        if (ca && hrs && hrs !== 0) {
          displayValue = (ca / hrs).toFixed(2);
        }
      }

      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            readOnly={isAuto}
            value={displayValue || ''}
            onChange={e => isAuto ? null : handleUpdate(lead.id, col.key, e.target.value)}
            className={`w-full bg-transparent text-navy/60 text-sm focus:text-navy focus:outline-none placeholder:text-navy/20 ${isAuto ? 'cursor-default font-medium text-primary' : ''}`}
            placeholder="0.00"
          />
          <span className="text-[10px] font-bold text-navy/30">€</span>
        </div>
      );
    }

    if (col.type === 'select') {
      const cfg = getStatusStyle(raw);
      return (
        <div className="relative group/select">
          <select
            value={raw || ''}
            onChange={e => handleUpdate(lead.id, col.key, e.target.value)}
            style={{ backgroundColor: cfg.bg, color: cfg.text }}
            className="w-full pl-3 pr-8 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest focus:outline-none appearance-none cursor-pointer transition-all border-none shadow-sm"
          >
            <option value="" className="bg-white text-navy/40">À RENSEIGNER</option>
            {col.options.map(opt => (
              <option key={opt} value={opt} className="bg-white text-navy font-sans normal-case tracking-normal text-sm">{opt}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover/select:opacity-100 transition-opacity" style={{ color: cfg.text }}>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      );
    }

    if (col.type === 'date_picker') {
      return (
        <div className="relative group/picker">
          <input
            type="date"
            defaultValue={raw || ''}
            onChange={e => handleUpdate(lead.id, col.key, e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-navy/[0.03] hover:bg-navy/[0.06] border border-transparent hover:border-navy/10 rounded-lg text-navy/60 hover:text-navy text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
          />
        </div>
      );
    }

    if (col.type === 'time') {
      const displayValue = (raw === '-' || raw === ':') ? '' : raw;
      return (
        <div className="relative group/picker">
          <input
            type="text"
            defaultValue={displayValue || ''}
            key={displayValue} // Force re-render if cleaned up
            onBlur={e => e.target.value !== (raw || '') && handleUpdate(lead.id, col.key, e.target.value)}
            placeholder="--h--min"
            className="w-full px-2 py-1.5 bg-navy/[0.03] hover:bg-navy/[0.06] border border-transparent hover:border-navy/10 rounded-lg text-navy text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-center placeholder:text-navy/20"
          />
        </div>
      );
    }

    if (col.type === 'pec_dates') {
      const parts = (raw || '').split(' AU ');
      const start = parts[0]?.replace('DU ', '') || '';
      const end = parts[1] || '';
      const isActive = activePicker?.id === lead.id && activePicker?.field === col.key;

      const updatePec = (newStart, newEnd) => {
        const s = newStart || '...';
        const e = newEnd || '...';
        const value = `DU ${s} AU ${e}`;
        handleUpdate(lead.id, col.key, value);
      };

      return (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePicker(isActive ? null : { id: lead.id, field: col.key });
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-lg group/pec transition-all w-full"
          >
            <Clock className="w-3 h-3 text-primary/40 group-hover/pec:text-primary transition-colors" />
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter truncate">
              {raw || 'DU ... AU ...'}
            </span>
          </button>

          {isActive && (
            <div
              ref={pickerRef}
              className="absolute bottom-full left-0 mb-2 z-[9999] bg-white border border-navy/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 flex flex-col gap-3 min-w-[300px] animate-in fade-in zoom-in-95 duration-200"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center justify-between border-b border-navy/5 pb-2 mb-1">
                <span className="text-[10px] font-black text-navy uppercase tracking-widest">Échéances PEC</span>
                <button onClick={() => setActivePicker(null)} className="text-navy/20 hover:text-navy">×</button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-navy/40 uppercase ml-1">Début</span>
                  <input
                    type="date"
                    value={start}
                    onChange={e => updatePec(e.target.value, end)}
                    className="w-full bg-navy/5 border-none rounded-xl px-3 py-2 text-xs text-navy font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-navy/40 uppercase ml-1">Fin</span>
                  <input
                    type="date"
                    value={end}
                    onChange={e => updatePec(start, e.target.value)}
                    className="w-full bg-navy/5 border-none rounded-xl px-3 py-2 text-xs text-navy font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="px-3 py-2 bg-primary text-white rounded-xl text-center">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                  {raw || 'DU ... AU ...'}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (col.type === 'auto') {
      let displayValue = raw;
      
      // Fallback extraction for display if DB is empty
      if (!displayValue && lead.adresse) {
        if (col.key === 'code_postal') {
          const cpMatch = lead.adresse.match(/\b\d{5}\b/);
          if (cpMatch) displayValue = cpMatch[0];
        } else if (col.key === 'code_departement') {
          const cpMatch = lead.adresse.match(/\b\d{5}\b/);
          if (cpMatch) displayValue = cpMatch[0].substring(0, 2);
        }
      }

      return (
        <span className={`${!raw && displayValue ? 'text-primary' : 'text-navy/40'} text-xs italic font-medium`}>
          {displayValue || 'auto'}
        </span>
      );
    }

    if (typeof raw === 'string' && raw.includes('http')) {
      const urlMatch = raw.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[0];
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline truncate block text-sm"
            title={raw}
            onClick={(e) => e.stopPropagation()}
          >
            {raw}
          </a>
        );
      }
    }

    return (
      <span
        className={[
          (col.key === 'siret' || col.key === 'lead_id') ? 'block text-xs font-bold' : 'truncate block text-sm',
          col.bold ? 'text-navy font-bold' : 'text-navy/70',
          col.mono ? 'font-mono tracking-tighter text-navy/90' : '',
        ].join(' ')}
        title={raw || ''}
      >
        {raw || '—'}
      </span>
    );
  };

  const tableMinWidth = COLUMNS.reduce((a, c) => a + c.width, 48);

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-700">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-1">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-navy/5 border border-navy/5 shadow-inner">
            <LayoutGrid className="w-5 h-5 text-navy" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-navy leading-none mb-1">Inventaire Leads</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">
                {leads.length.toLocaleString()} {activeTab === 'leads' ? 'chargés' : 'extraits'}
              </span>
              <div className="w-1 h-1 rounded-full bg-navy/20" />
              {totalCount > 0 && (
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {totalCount.toLocaleString()} au total
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy/20 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une entreprise, SIRET..."
              className="pl-11 pr-5 py-3.5 bg-white border border-navy/10 rounded-2xl text-sm text-navy placeholder:text-navy/20 focus:outline-none focus:ring-4 focus:ring-primary/5 w-80 transition-all shadow-sm"
            />
          </div>
          
          <button className="p-3.5 rounded-2xl border border-navy/10 bg-white hover:bg-navy/5 text-navy/30 hover:text-navy transition-all shadow-sm group">
            <Filter className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          </button>

          <a
            href="https://quel-est-mon-opco.francecompetences.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3.5 bg-navy text-white rounded-2xl text-sm font-bold hover:bg-navy/90 transition-all shadow-lg shadow-navy/10 group"
          >
            Vérif OPCO
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-[2rem] border border-navy/5 overflow-hidden shadow-2xl shadow-navy/5 bg-white"
      >
        <div className="overflow-x-auto custom-scrollbar">
          <div style={{ minWidth: tableMinWidth + 'px' }}>

            {/* Header row */}
            <div
              className="flex items-center border-b border-navy/5"
              style={{ background: '#FDFDFF', position: 'sticky', top: 0, zIndex: 20 }}
            >
              <div className="w-14 flex-shrink-0 px-5 py-4 text-[10px] font-black text-navy/20 uppercase tracking-widest text-center italic">#</div>
              {COLUMNS.map(col => (
                <div
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  className="flex-shrink-0 px-6 py-4 text-[11px] font-black text-navy/60 uppercase tracking-[0.15em] border-l border-navy/[0.03]"
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-4 border-navy/10 border-t-primary rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.3em]">Synchronisation en cours…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-16 h-16 rounded-3xl bg-navy/5 flex items-center justify-center">
                  <span className="text-3xl grayscale opacity-50 text-navy">📭</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-black text-navy/40 uppercase tracking-widest">Aucune donnée</span>
                  <p className="text-xs text-navy/20">La requête n'a retourné aucun résultat pour ce filtre.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-navy/[0.03]">
                {filtered.map((lead, i) => (
                  <div
                    key={lead.id}
                    style={{ zIndex: activePicker?.id === lead.id ? 100 : 1 }}
                    className="flex items-center hover:bg-navy/[0.01] transition-colors group/row"
                  >
                    <div className="w-14 flex-shrink-0 px-5 py-3 text-[10px] font-mono font-bold text-navy/10 group-hover/row:text-primary transition-colors text-center border-r border-navy/[0.02]">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    {COLUMNS.map(col => (
                      <div
                        key={col.key}
                        style={{ width: col.width, minWidth: col.width }}
                        className={`flex-shrink-0 px-6 py-3 border-l border-navy/[0.02] ${col.type === 'pec_dates' || col.type === 'select' ? '' : 'overflow-hidden'}`}
                      >
                        {renderCell(lead, col)}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Load More button */}
                {hasMore && !search && (
                  <div className="flex items-center justify-center py-10 bg-navy/[0.01]">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-white border border-navy/10 text-navy text-sm font-black hover:bg-navy hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" /> Voir les 500 suivants ({(totalCount - leads.length).toLocaleString()} restants)</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MondayTable;
