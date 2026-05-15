import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, Eye, EyeOff, Check, Palette } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const DEFAULT_COLORS = {
  'A TRAITER':            '#1e293b', 
  'ABSENT':               '#64748b',
  'DEJA PEC':             '#8b5cf6',
  'FAUX NUM':             '#dc2626',
  'HORS CIBLE OPCO':      '#374151',
  'HORS CIBLE SIÈGE':     '#374151',
  'HORS CIBLE SALARIÉS':  '#374151',
  'NRP':                  '#1d4ed8',
  'OCCUPÉ':               '#0891b2',
  'PAS DE NUM':           '#7c3aed',
  'PI':                   '#0f172a',
  'RAPPEL':               '#d97706',
  'RDV':                  '#16a34a',
  'EN ATTENTE RDV':       '#f97316',
  'REPONDEUR':            '#475569',
  'SIGNE':                '#ff007f',
  'À RENSEIGNER':         '#1a1a1a',
  'TNS':                  '#c084fc',
  '2 TNS':                '#e9d5ff',
  'GÉRANT SALARIÉ':       '#facc15',
  '2 GÉRANTS SALARIÉS':   '#a3e635'
};

const StatusConfigModal = ({ isOpen, onClose, column, onRefresh }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (isOpen && column) {
      // Parse: "LABEL::COLOR::VISIBILITY"
      const parsed = (column.options || []).map((opt, i) => {
        const parts = opt.split('::');
        const label = parts[0] || 'NOUVEAU';
        const color = parts[1] || DEFAULT_COLORS[label.toUpperCase().trim()] || '#64748b';
        const visibility = parts[2];
        
        return { 
          id: `opt-${i}-${Date.now()}`,
          label: label, 
          color: color, 
          isHidden: visibility === 'h' 
        };
      });
      setOptions(parsed);
    }
  }, [isOpen, column]);

  const handleAdd = () => {
    const newOption = { id: `new-${Date.now()}`, label: 'NOUVEAU', color: '#64748b', isHidden: false };
    setOptions([...options, newOption]);
  };

  const handleUpdate = (id, updates) => {
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, ...updates } : opt));
  };

  const handleRemove = (id) => {
    setOptions(prev => prev.filter(opt => opt.id !== id));
  };

  const handleSave = async () => {
    setLoading(true);
    // Format: "LABEL::COLOR::VISIBILITY"
    const formatted = options.map(opt => 
      `${opt.label.toUpperCase().trim()}::${opt.color}::${opt.isHidden ? 'h' : 'v'}`
    );
    
    const { error } = await supabase
      .from('crm_column_configs')
      .update({ options: formatted })
      .eq('key', column.key);

    if (!error) {
      onRefresh();
      onClose();
    } else {
      alert('Erreur: ' + error.message);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card w-full max-w-md rounded-[2rem] shadow-[0_20px_70px_rgba(0,0,0,0.4)] border border-navy/10 flex flex-col overflow-hidden"
      >
        {/* Compact Header */}
        <div className="px-6 py-4 border-b border-navy/5 flex items-center justify-between bg-navy/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Palette className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-black text-navy uppercase tracking-widest">Réglages : {column.label}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-full text-navy/20 hover:text-navy transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Draggable List */}
        <div className="flex-1 overflow-y-auto max-h-[450px] p-6 custom-scrollbar">
          <Reorder.Group axis="y" values={options} onReorder={setOptions} className="space-y-3">
            {options.map((opt) => (
              <Reorder.Item 
                key={opt.id} 
                value={opt}
                whileDrag={{ 
                  scale: 1.03, 
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  zIndex: 50
                }}
                className={`flex items-center gap-4 p-3 bg-card border border-navy/[0.08] rounded-2xl cursor-grab active:cursor-grabbing transition-colors group ${opt.isHidden ? 'opacity-50 grayscale' : 'shadow-sm hover:border-primary/30'}`}
              >
                {/* Drag Handle */}
                <div className="shrink-0 text-navy/10 group-hover:text-navy/30 transition-colors">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Color Input (Styled) */}
                <div className="relative shrink-0">
                  <input 
                    type="color" 
                    value={opt.color}
                    onChange={(e) => handleUpdate(opt.id, { color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-xl transition-transform hover:scale-110"
                  />
                </div>

                {/* Label Input */}
                <input 
                  type="text" 
                  value={opt.label}
                  onChange={(e) => handleUpdate(opt.id, { label: e.target.value.toUpperCase() })}
                  className="flex-1 bg-transparent border-none text-xs font-black text-navy focus:ring-0 p-1 placeholder:text-navy/10 tracking-wider"
                  placeholder="NOM DU STATUT..."
                />

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button 
                    onClick={() => handleUpdate(opt.id, { isHidden: !opt.isHidden })}
                    className={`p-2 rounded-xl transition-all ${opt.isHidden ? 'text-primary bg-primary/5' : 'text-navy/20 hover:text-navy hover:bg-navy/5'}`}
                    title={opt.isHidden ? "Afficher" : "Masquer"}
                  >
                    {opt.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleRemove(opt.id)}
                    className="p-2 text-navy/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <button 
            onClick={handleAdd}
            className="w-full mt-4 py-3 border-2 border-dashed border-navy/5 rounded-xl text-[10px] font-black text-navy/20 uppercase tracking-[0.2em] hover:border-primary/20 hover:text-primary hover:bg-primary/[0.01] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une option
          </button>
        </div>

        {/* Compact Footer */}
        <div className="p-4 bg-navy/[0.01] border-t border-navy/5 flex gap-2">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-navy/30 hover:bg-navy/5 rounded-xl transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] bg-primary text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? '...' : 'Sauvegarder les réglages'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default StatusConfigModal;
