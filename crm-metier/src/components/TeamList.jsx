import React, { useState, useEffect } from 'react';
import { teamService } from '../lib/teamService';
import { 
  User, ShieldCheck, Mail, UserPlus, Trash2, 
  Settings2, UserCheck, UserX, Briefcase, ChevronRight,
  Plus, X, Save, AlertCircle, Check, RefreshCw
} from 'lucide-react';

const ROLES = [
  { value: 'funebooster', label: 'Funebooster', color: 'primary' },
  { value: 'commercial', label: 'Commercial', color: 'secondary' },
  { value: 'admin', label: 'Admin', color: 'navy' }
];

const CLIENTS = [
  'CA CONSEILS', 'TB FORMATIONS', 'GO CONSEILS', 'HORS ZONE', 'IT PERFORMANCE'
];

const TeamList = ({ currentUser }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'funebooster', client: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await teamService.getAllMembers();
      setMembers(data);
    } catch (err) {
      setError("Impossible de charger l'équipe");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await teamService.updateMember(id, { is_active: !currentStatus });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
    } catch (err) {
      alert("Erreur lors de la modification du statut");
    }
  };

  const handleUpdateRole = async (id, newRole) => {
    try {
      const updates = { role: newRole };
      if (newRole !== 'commercial') updates.client = null;
      await teamService.updateMember(id, updates);
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    } catch (err) {
      alert("Erreur lors de la modification du rôle");
    }
  };

  const handleUpdateClient = async (id, newClient) => {
    try {
      await teamService.updateMember(id, { client: newClient });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, client: newClient } : m));
    } catch (err) {
      alert("Erreur lors de la modification du client");
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) return;
    try {
      await teamService.deleteMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const added = await teamService.addMember(newMember);
      setMembers(prev => [...prev, added]);
      setIsAddModalOpen(false);
      setNewMember({ name: '', email: '', role: 'funebooster', client: '' });
    } catch (err) {
      alert(err.message.includes('unique') ? "Cet email existe déjà" : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  // Helper to group members by role
  const groupedMembers = {
    admin: members.filter(m => m.role === 'admin'),
    funebooster: members.filter(m => m.role === 'funebooster'),
    commercial: members.filter(m => m.role === 'commercial')
  };

  const renderMemberCard = (member) => (
    <div 
      key={member.id} 
      className={`glass-panel p-6 rounded-[2.5rem] border transition-all duration-500 relative group bg-white
        ${member.is_active ? 'border-navy/5 shadow-xl hover:shadow-2xl' : 'border-dashed border-navy/10 opacity-60 grayscale shadow-none'}
        ${isAdmin ? 'hover:border-primary/20' : ''}`}
    >
      <div className="flex items-start gap-5">
        {/* Avatar section */}
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors flex-shrink-0
          ${member.role === 'admin' ? 'bg-navy/5 text-navy' : 
            member.role === 'commercial' ? 'bg-secondary/5 text-secondary' : 'bg-primary/5 text-primary'}`}>
          <User className="w-8 h-8" />
        </div>

        {/* Info section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xl font-black text-navy tracking-tight truncate">{member.name}</span>
            {!member.is_active && (
              <span className="px-2 py-0.5 rounded-lg bg-navy/10 text-[9px] font-black text-navy/40 uppercase tracking-widest">Désactivé</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-navy/40 mb-4">
            <Mail className="w-3.5 h-3.5" />
            <span className="text-xs font-bold tracking-tight">{member.email}</span>
          </div>

          {/* Management Controls (Admin only) */}
          {isAdmin && (
            <div className="space-y-4 pt-4 border-t border-navy/5">
              <div className="flex flex-wrap items-center gap-3">
                {/* Role Selector */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                  <span className="text-[9px] font-black text-navy/20 uppercase tracking-widest ml-1">Type d'accès</span>
                  <select 
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                    className="bg-navy/5 border-none rounded-xl px-3 py-2 text-[11px] font-black text-navy uppercase focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                {/* Client Selector (only for commercial) */}
                {member.role === 'commercial' && (
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[140px] animate-in slide-in-from-left-2 duration-300">
                    <span className="text-[9px] font-black text-navy/20 uppercase tracking-widest ml-1">Client assigné</span>
                    <select 
                      value={member.client || ''}
                      onChange={(e) => handleUpdateClient(member.id, e.target.value)}
                      className="bg-secondary/5 border-none rounded-xl px-3 py-2 text-[11px] font-black text-secondary uppercase focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer"
                    >
                      <option value="">— CHOISIR —</option>
                      {CLIENTS.map(client => (
                        <option key={client} value={client}>{client}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleStatus(member.id, member.is_active)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-500 p-1 flex items-center
                        ${member.is_active ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-navy/20'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-500 transform
                        ${member.is_active ? 'translate-x-6 scale-110' : 'translate-x-0'}`} 
                      />
                    </button>
                    <span className={`text-[9px] font-black uppercase tracking-widest transition-colors
                      ${member.is_active ? 'text-green-500' : 'text-navy/30'}`}>
                      {member.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <button 
                    onClick={() => handleDeleteMember(member.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-navy/5 text-navy/40 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>

                <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                  ${member.role === 'admin' ? 'bg-navy text-white' : 
                    member.role === 'commercial' ? 'bg-secondary text-white' : 'bg-primary text-white'}`}>
                  {member.role}
                </div>
              </div>
            </div>
          )}

          {/* Non-admin view */}
          {!isAdmin && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest
                ${member.role === 'admin' ? 'bg-navy/10 text-navy' : 
                  member.role === 'commercial' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                Accès {member.role}
              </span>
              {member.client && (
                <span className="px-2 py-0.5 rounded-lg bg-navy/5 text-[9px] font-black text-navy/40 uppercase tracking-widest">
                  {member.client}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-navy/10 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.3em]">Chargement de l'équipe...</span>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-navy/5 shadow-xl shadow-navy/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-navy tracking-tight">Configuration de l'Équipe</h2>
            <p className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">Gérez les accès et les rôles de vos collaborateurs</p>
          </div>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-navy text-white rounded-2xl text-sm font-black hover:bg-primary transition-all shadow-lg shadow-navy/10 group"
          >
            <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            AJOUTER UN MEMBRE
          </button>
        )}
      </div>

      {/* Admin Section */}
      {groupedMembers.admin.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-4">
            <ShieldCheck className="w-5 h-5 text-navy" />
            <h3 className="text-lg font-black text-navy uppercase tracking-widest">Administrateurs</h3>
            <div className="h-px flex-1 bg-navy/5" />
            <span className="text-[10px] font-black text-navy/20 uppercase tracking-[0.2em]">{groupedMembers.admin.length}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {groupedMembers.admin.map(renderMemberCard)}
          </div>
        </section>
      )}

      {/* Funbooster Section */}
      {groupedMembers.funebooster.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black text-primary uppercase tracking-widest">Équipe Funbooster</h3>
            <div className="h-px flex-1 bg-primary/5" />
            <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{groupedMembers.funebooster.length}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {groupedMembers.funebooster.map(renderMemberCard)}
          </div>
        </section>
      )}

      {/* Commercial Section */}
      {groupedMembers.commercial.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-4">
            <Briefcase className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-black text-secondary uppercase tracking-widest">Équipe Commerciale</h3>
            <div className="h-px flex-1 bg-secondary/5" />
            <span className="text-[10px] font-black text-secondary/20 uppercase tracking-[0.2em]">{groupedMembers.commercial.length}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {groupedMembers.commercial.map(renderMemberCard)}
          </div>
        </section>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
          
          <form 
            onSubmit={handleAddMember}
            className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-black text-navy tracking-tight">Nouveau Membre</h3>
                <p className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">Ajoutez un collaborateur au CRM</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-2xl bg-navy/5 flex items-center justify-center hover:bg-navy/10 transition-colors">
                <X className="w-5 h-5 text-navy" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">Nom Complet</label>
                <input 
                  autoFocus
                  type="text" 
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  className="bg-navy/5 border border-navy/10 rounded-2xl px-5 py-4 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-navy/20"
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">E-mail @docendIA</label>
                <input 
                  type="email" 
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  className="bg-navy/5 border border-navy/10 rounded-2xl px-5 py-4 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-navy/20"
                  placeholder="nom@docendia.fr"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">Rôle</label>
                  <select 
                    value={newMember.role}
                    onChange={(e) => setNewMember({...newMember, role: e.target.value, client: e.target.value !== 'commercial' ? '' : newMember.client})}
                    className="bg-navy/5 border-none rounded-2xl px-5 py-4 text-sm text-navy font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                {newMember.role === 'commercial' && (
                  <div className="flex flex-col gap-2 animate-in slide-in-from-right-4">
                    <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">Client OF</label>
                    <select 
                      required
                      value={newMember.client}
                      onChange={(e) => setNewMember({...newMember, client: e.target.value})}
                      className="bg-secondary/5 border-none rounded-2xl px-5 py-4 text-sm text-secondary font-bold focus:ring-2 focus:ring-secondary/20 transition-all"
                    >
                      <option value="">Choisir...</option>
                      {CLIENTS.map(client => (
                        <option key={client} value={client}>{client}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-navy text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:grayscale"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {saving ? 'ENREGISTREMENT...' : 'CRÉER L\'ACCÈS'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeamList;
