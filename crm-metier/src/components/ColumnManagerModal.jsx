import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Settings, ChevronUp, ChevronDown, 
  Save, AlertCircle, List, Type, Calendar, Clock, 
  DollarSign, Hash, GripVertical, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const ColumnManagerModal = ({ isOpen, onClose, onRefresh }) => {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCol, setNewCol] = useState({
    label: '',
    key: '',
    type: 'text',
    options: '',
    width: 150
  });

  useEffect(() => {
    if (isOpen) fetchColumns();
  }, [isOpen]);

  const fetchColumns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_column_configs')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (!error && data) setColumns(data);
    setLoading(false);
  };

  const handleAddColumn = async () => {
    if (!newCol.label || !newCol.key) return alert('Veuillez remplir le nom et la clé.');
    
    setSaving(true);
    const optionsArray = newCol.type === 'select' 
      ? newCol.options.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    const payload = {
      label: newCol.label,
      key: newCol.key.toLowerCase().replace(/\s+/g, '_'),
      type: newCol.type,
      options: optionsArray,
      width: parseInt(newCol.width),
      display_order: columns.length,
      is_visible: true
    };

    const { error } = await supabase.from('crm_column_configs').insert([payload]);
    
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setIsAdding(false);
      setNewCol({ label: '', key: '', type: 'text', options: '', width: 150 });
      fetchColumns();
      onRefresh();
    }
    setSaving(false);
  };

  const handleDeleteColumn = async (id, key) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette colonne ? Les données existantes dans "custom_fields" resteront mais ne seront plus affichées.')) {
      const { error } = await supabase.from('crm_column_configs').delete().eq('id', id);
      if (!error) {
        fetchColumns();
        onRefresh();
      }
    }
  };

  const toggleVisibility = async (col) => {
    const { error } = await supabase
      .from('crm_column_configs')
      .update({ is_visible: !col.is_visible })
      .eq('id', col.id);
    if (!error) fetchColumns();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-navy/5 flex items-center justify-between bg-gradient-to-r from-white to-navy/[0.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-navy tracking-tight">Configuration des Colonnes</h2>
              <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em] mt-0.5">Gestion Dynamique du Tableau</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-navy/5 rounded-2xl transition-all hover:scale-110 active:scale-95 text-navy/20 hover:text-navy">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* Add New Column Section */}
          <div className={`mb-8 p-6 rounded-3xl border-2 border-dashed transition-all ${isAdding ? 'border-primary/40 bg-primary/[0.02]' : 'border-navy/10 bg-navy/[0.01] hover:border-navy/20'}`}>
            {!isAdding ? (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-3 py-4 text-navy/40 hover:text-primary transition-all font-bold group"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                Ajouter une nouvelle colonne personnalisée
              </button>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Nom de la colonne</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Source du Lead" 
                      value={newCol.label}
                      onChange={(e) => setNewCol({...newCol, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                      className="w-full bg-white border border-navy/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Clé technique (Unique)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: source_lead" 
                      value={newCol.key}
                      onChange={(e) => setNewCol({...newCol, key: e.target.value})}
                      className="w-full bg-navy/5 border border-navy/10 rounded-2xl px-5 py-3.5 text-sm font-mono text-navy/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Type de donnée</label>
                    <select 
                      value={newCol.type}
                      onChange={(e) => setNewCol({...newCol, type: e.target.value})}
                      className="w-full bg-white border border-navy/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="text">Texte Libre</option>
                      <option value="number">Nombre</option>
                      <option value="currency">Montant (€)</option>
                      <option value="date">Date (Simple)</option>
                      <option value="date_picker">Sélecteur de Date</option>
                      <option value="time">Heure</option>
                      <option value="select">Liste déroulante</option>
                      <option value="editable">Texte Éditable</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Largeur (px)</label>
                    <input 
                      type="number" 
                      value={newCol.width}
                      onChange={(e) => setNewCol({...newCol, width: e.target.value})}
                      className="w-full bg-white border border-navy/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-navy"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-3.5 rounded-2xl text-xs font-black text-navy/40 hover:bg-navy/5 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleAddColumn}
                      disabled={saving}
                      className="flex-[2] bg-primary text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {saving ? 'Création...' : 'Créer la colonne'}
                    </button>
                  </div>
                </div>

                {newCol.type === 'select' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Options (séparées par des virgules)</label>
                    <textarea 
                      placeholder="Option 1, Option 2, Option 3..."
                      value={newCol.options}
                      onChange={(e) => setNewCol({...newCol, options: e.target.value})}
                      className="w-full bg-white border border-navy/10 rounded-2xl px-5 py-3 text-sm font-bold text-navy min-h-[80px] focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columns List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em] mb-4 ml-1">Liste des colonnes actives</h3>
            
            {loading ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold text-navy/20 uppercase tracking-widest">Chargement de la configuration...</p>
              </div>
            ) : columns.map((col, idx) => (
              <div 
                key={col.id} 
                className={`group flex items-center gap-4 p-4 rounded-3xl border transition-all ${col.is_visible ? 'bg-white border-navy/5 hover:border-primary/20 hover:shadow-xl hover:shadow-navy/5' : 'bg-navy/[0.02] border-transparent opacity-60'}`}
              >
                <div className="p-3 bg-navy/[0.03] rounded-2xl text-navy/20">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-navy">{col.label}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-navy/5 text-navy/40 rounded-full uppercase tracking-tighter">{col.type}</span>
                  </div>
                  <p className="text-[10px] font-mono text-navy/20">{col.key}</p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => toggleVisibility(col)}
                    className={`p-2.5 rounded-xl transition-all ${col.is_visible ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-navy/20 bg-navy/5 hover:bg-navy/10'}`}
                    title={col.is_visible ? "Masquer" : "Afficher"}
                  >
                    <Check className={`w-5 h-5 ${col.is_visible ? 'opacity-100' : 'opacity-20'}`} />
                  </button>
                  
                  {/* Native columns can't be deleted for safety */}
                  {!['lead_id', 'nom_entreprise', 'funebooster', 'status', 'date_rdv'].includes(col.key) && (
                    <button 
                      onClick={() => handleDeleteColumn(col.id, col.key)}
                      className="p-2.5 bg-red-50 text-red-400 hover:bg-red-100 rounded-xl transition-all hover:scale-110 active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-navy/5 bg-navy/[0.01] flex items-center justify-between">
          <p className="text-[11px] text-navy/40 font-medium max-w-md">
            Les modifications apportées ici sont appliquées instantanément pour tous les utilisateurs. Les nouvelles colonnes seront stockées dans le champ <code className="bg-navy/5 px-1.5 py-0.5 rounded text-primary">custom_fields</code>.
          </p>
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-navy text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-navy/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-navy/20"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColumnManagerModal;
