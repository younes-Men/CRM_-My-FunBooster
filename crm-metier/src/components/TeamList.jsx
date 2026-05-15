import React, { useState, useEffect, useMemo } from 'react';
import { ALL_COLUMNS } from '../lib/columns';
import { teamService } from '../lib/teamService';
import { 
  User, ShieldCheck, Mail, UserPlus, Trash2, 
  Settings2, UserCheck, UserX, Briefcase, ChevronRight,
  Plus, X, Save, AlertCircle, Check, RefreshCw,
  Search, Layout, Calendar, Bell, ListChecks, Lock,
  Phone, Users, CreditCard, Building2, Eye, EyeOff, Grid
} from 'lucide-react';

const ROLES = [
  { value: 'funebooster', label: 'Funebooster', color: 'primary' },
  { value: 'commercial', label: 'Commercial', color: 'secondary' },
  { value: 'admin', label: 'Admin', color: 'navy' }
];

// CLIENTS will be fetched from the database now

const PERMISSION_KEYS = [
  { id: 'view_agenda',      label: 'Accès Agenda',    icon: Calendar,    hasClients: true },
  { id: 'view_zone_temp',   label: 'Accès Zone Tampon', icon: Bell,         hasClients: false },
  { id: 'control_zone_temp',label: 'Gérer Zone Tampon', icon: Settings2,    hasClients: false },
  { id: 'view_leads',       label: 'Accès Leads',     icon: ListChecks,   hasColumns: true },
  { id: 'view_pipeline',    label: 'Accès Pipeline',  icon: Layout,       hasClients: true },
];

const TeamList = ({ currentUser }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my_team'); // 'my_team', 'cabinet', 'utilisateurs', 'equipe'
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newClient, setNewClient] = useState({ name: '', prefix: '' });
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [allClients, setAllClients] = useState([]);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    setSelectedClient(null);
  }, [activeTab]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const [membersData, clientsData] = await Promise.all([
        teamService.getAllMembers(),
        teamService.getAllClients()
      ]);
      
      setAllClients(clientsData);
      
      const cleanedData = membersData.map(m => {
        let clients = m.client;
        
        const cleanString = (str) => {
          if (!str) return [];
          // Try to extract all quoted strings (works for JSON and corrupted JSON+Text)
          const matches = str.match(/"([^"]+)"/g);
          if (matches && matches.length > 0) {
            return matches.map(m => m.replace(/"/g, '').trim());
          }
          // Fallback: split by comma and remove brackets
          return str.split(',').map(c => c.replace(/[\[\]]/g, '').trim()).filter(Boolean);
        };

        if (typeof clients === 'string') {
          clients = cleanString(clients);
        } else if (!Array.isArray(clients)) {
          clients = clients ? [clients] : [];
        }
        
        // Ensure flat unique array of strings
        clients = [...new Set(clients.flat().map(c => String(c).trim()))].filter(Boolean);

        return { ...m, client: clients };
      });
      setMembers(cleanedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (e, clientName) => {
    e.stopPropagation();
    const client = allClients.find(c => c.name === clientName);
    if (!client) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?\n\nCela ne supprimera pas les collaborateurs, mais ils ne seront plus rattachés à cette entité.`)) return;
    
    try {
      setLoading(true);
      await teamService.deleteClient(client.id);
      setAllClients(prev => prev.filter(c => c.id !== client.id));
      // Refresh members to see the impact (though they stay in DB)
      fetchMembers();
    } catch (err) {
      alert("Erreur lors de la suppression du client");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!newClient.name || !newClient.prefix) return alert("Veuillez remplir tous les champs");
    
    setSaving(true);
    try {
      const saved = await teamService.addClient({
        name: newClient.name.toUpperCase(),
        prefix: newClient.prefix.toUpperCase()
      });
      setAllClients(prev => [...prev, saved]);
      setIsClientModalOpen(false);
      setNewClient({ name: '', prefix: '' });
    } catch (err) {
      alert("Erreur lors de la création du client");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let memberToSave = { ...editingMember };
      
      // Safety check: ensure identifier is generated if missing
      if (!memberToSave.identifier) {
        const generatedId = generateNewIdentifier(memberToSave.role, memberToSave.client);
        if (generatedId) {
          memberToSave.identifier = generatedId;
          if (!memberToSave.password) memberToSave.password = generatedId;
        }
      }

      if (memberToSave.id) {
        const { id, created_at, ...updates } = memberToSave;
        // Stringify client array for the database if it's an array
        const updatesForDb = { 
          ...updates, 
          client: Array.isArray(updates.client) ? JSON.stringify(updates.client) : updates.client 
        };
        await teamService.updateMember(id, updatesForDb);
        setMembers(prev => prev.map(m => m.id === id ? memberToSave : m));
      } else {
        // Stringify client array for the database
        const memberForDb = { 
          ...memberToSave, 
          client: Array.isArray(memberToSave.client) ? JSON.stringify(memberToSave.client) : memberToSave.client 
        };
        const added = await teamService.addMember(memberForDb);
        // Ensure the local state has the cleaned array version
        const addedCleaned = { 
          ...added, 
          client: Array.isArray(memberToSave.client) ? memberToSave.client : added.client 
        };
        setMembers(prev => [...prev, addedCleaned]);
      }
      setIsEditModalOpen(false);
    } catch (err) {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (key) => {
    setEditingMember(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const toggleColumn = (colKey) => {
    setEditingMember(prev => {
      let current = prev.permissions?.leads_columns || [];
      let next;
      
      if (current.includes('all')) {
        // If currently 'all', and we toggle one, we switch to "all columns except this one"
        next = ALL_COLUMNS.map(c => c.key).filter(k => k !== colKey);
      } else {
        next = current.includes(colKey)
          ? current.filter(k => k !== colKey)
          : [...current, colKey];
          
        // If all individual columns are now selected, just set it to 'all'
        if (next.length === ALL_COLUMNS.length) next = ['all'];
      }
      
      return {
        ...prev,
        permissions: { ...prev.permissions, leads_columns: next }
      };
    });
  };

  const toggleAllColumns = () => {
    setEditingMember(prev => {
      const current = prev.permissions?.leads_columns || [];
      const next = current.includes('all') ? [] : ['all'];
      return {
        ...prev,
        permissions: { ...prev.permissions, leads_columns: next }
      };
    });
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const mClients = Array.isArray(m.client) ? m.client : (m.client ? [m.client] : []);
      const matchesSearch = 
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.identifier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mClients.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;

      if (activeTab === 'equipe') return m.role === 'funebooster';
      if (activeTab === 'utilisateurs') return m.role === 'commercial';
      if (activeTab === 'cabinet') return m.role === 'admin';
      return true;
    });
  }, [members, activeTab, searchQuery]);

  const generateNewIdentifier = (role, clientName) => {
    let baseId = '';
    if (role === 'funebooster') {
      baseId = 'DO1000';
    } else if (role === 'commercial') {
      const cName = Array.isArray(clientName) ? clientName[0] : clientName;
      const clientObj = allClients.find(c => c.name === cName);
      if (clientObj?.prefix) {
        baseId = clientObj.prefix;
      } else {
        return ''; // Need client selection first or client has no prefix
      }
    } else if (role === 'admin') {
      baseId = 'AD1000';
    } else {
      return ''; 
    }

    // Find existing members with this base prefix to determine next sub-ID
    const relatedMembers = members.filter(m => m.identifier?.startsWith(baseId + '-'));
    
    let nextNum = 1;
    if (relatedMembers.length > 0) {
      const nums = relatedMembers.map(m => {
        const parts = m.identifier.split('-');
        return parseInt(parts[1]) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }

    return `${baseId}-${nextNum}`;
  };

  const openAddModal = (role) => {
    setEditingMember({
      name: '',
      email: '',
      role: role,
      client: [],
      identifier: '',
      password: '',
      phone: '',
      gender: 'Monsieur',
      is_active: true,
      permissions: {
        view_agenda: true,
        view_zone_temp: false,
        control_zone_temp: false,
        view_leads: true,
        view_pipeline: role === 'commercial',
        leads_columns: ["all"],
        assigned_commercials: []
      }
    });
    setIsEditModalOpen(true);
  };

  // Auto-generate ID when role or client changes for members missing an identifier
  useEffect(() => {
    if (isEditModalOpen && editingMember && !editingMember.identifier) {
      const newId = generateNewIdentifier(editingMember.role, editingMember.client);
      if (newId && newId !== editingMember.identifier) {
        setEditingMember(prev => ({ 
          ...prev, 
          identifier: newId, 
          password: prev.password || newId // Only set password if empty
        }));
      }
    }
  }, [editingMember?.role, editingMember?.client, isEditModalOpen, members]);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Tabs Header */}
      <div className="flex items-center gap-2 p-1 bg-navy/5 rounded-[2rem] w-fit">
        <TabButton active={activeTab === 'my_team'} onClick={() => setActiveTab('my_team')} icon={Grid} label="MY TEAM" />
        <TabButton active={activeTab === 'cabinet'} onClick={() => setActiveTab('cabinet')} icon={Building2} label="MON CABINET" />
        <TabButton active={activeTab === 'utilisateurs'} onClick={() => setActiveTab('utilisateurs')} icon={Users} label="MES UTILISATEURS" />
        <TabButton active={activeTab === 'equipe'} onClick={() => setActiveTab('equipe')} icon={ShieldCheck} label="MY FUNBOOSTER" />
      </div>

      {/* Main Container */}
      <div className="bg-card rounded-[2.5rem] border border-navy/5 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        
        {/* Actions Bar */}
        <div className="p-8 border-b border-navy/5 flex items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/20" />
            <input 
              type="text"
              placeholder={activeTab === 'my_team' ? "Rechercher un client..." : "Rechercher un utilisateur..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-navy/[0.02] border border-navy/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <button 
            onClick={() => activeTab === 'my_team' ? setIsClientModalOpen(true) : openAddModal(activeTab === 'equipe' ? 'funebooster' : activeTab === 'cabinet' ? 'admin' : 'commercial')}
            className={`px-6 py-3 ${activeTab === 'my_team' ? 'bg-active text-white' : 'bg-navy/10 text-navy'} rounded-2xl text-sm font-black hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-active/20`}
          >
            {activeTab === 'my_team' ? <Plus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {activeTab === 'my_team' ? 'NOUVEAU CLIENT' : 
             activeTab === 'equipe' ? 'AJOUTER UN FUNBOOSTER' : 
             activeTab === 'utilisateurs' ? 'AJOUTER UN COMMERCIAL' : 'CRÉER UN UTILISATEUR'}
          </button>
        </div>

        {/* Table View or Cabinet View */}
        <div className="flex-1 overflow-x-auto">
          {activeTab === 'my_team' && !selectedClient ? (
            <div className="p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold font-outfit text-navy tracking-tight">DASHBOARD CLIENTS</h2>
                  <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.25em] mt-1">{allClients.length} CLIENTS ACTIFS</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {allClients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(clientObj => {
                  const client = clientObj.name;
                  const clientMembers = members.filter(m => 
                    Array.isArray(m.client) ? m.client.includes(client) : m.client === client
                  );
                  const commCount = clientMembers.filter(m => m.role === 'commercial').length;
                  const funbCount = clientMembers.filter(m => m.role === 'funebooster').length;
                  const clientPrefix = clientObj.prefix || clientMembers[0]?.identifier?.split('-')[0] || '—';

                  return (
                    <div 
                      key={clientObj.id}
                      className="glass-panel p-8 rounded-[3rem] shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all group relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div className="flex items-start justify-between mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-inner">
                          <Building2 className="w-7 h-7" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-navy/20 bg-navy/5 px-2 py-1 rounded-lg">{clientPrefix}</span>
                          <button 
                            onClick={(e) => handleDeleteClient(e, client)}
                            className="p-2 hover:bg-red-50 text-red-200 hover:text-red-400 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-black text-navy uppercase tracking-tight leading-tight">{client}</h3>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-secondary" />
                            <span className="text-[10px] font-black text-navy/40 uppercase tracking-wider">{commCount} COMM.</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-navy/10" />
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-black text-navy/40 uppercase tracking-wider">{funbCount} FUNB.</span>
                          </div>
                        </div>

                        {/* Avatars */}
                        <div className="flex -space-x-3 pt-4">
                          {clientMembers.slice(0, 4).map((m, i) => (
                            <div key={m.id} className="w-9 h-9 rounded-xl bg-navy/5 border-2 border-card flex items-center justify-center text-[10px] font-black text-navy uppercase shadow-sm">
                              {m.name?.substring(0, 2)}
                            </div>
                          ))}
                          {clientMembers.length > 4 && (
                            <div className="w-9 h-9 rounded-xl bg-navy/5 border-2 border-card flex items-center justify-center text-[10px] font-black text-navy/40 uppercase shadow-sm">
                              +{clientMembers.length - 4}
                            </div>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={() => setSelectedClient(client)}
                        className="absolute bottom-8 right-8 w-10 h-10 rounded-xl bg-active text-white opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-300 flex items-center justify-center"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'my_team' && selectedClient ? (
            <div className="p-12 space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Client Detail Header */}
              <div className="flex items-center gap-8">
                <button 
                  onClick={() => setSelectedClient(null)} 
                  className="p-4 rounded-[1.5rem] bg-navy/5 text-navy hover:bg-navy hover:text-white transition-all shadow-sm"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <div>
                  <h2 className="text-4xl font-black text-navy tracking-tight uppercase">{selectedClient}</h2>
                  <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.25em] mt-1">Équipe Commerciale & Assistance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Commerciaux & Their Assistants */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 ml-2">
                    <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center"><Users className="w-4 h-4 text-secondary" /></div>
                    <h4 className="text-xs font-black text-navy uppercase tracking-widest">Commerciaux & Assistants</h4>
                  </div>
                  
                  <div className="space-y-6">
                    {members.filter(m => 
                      (Array.isArray(m.client) ? m.client.includes(selectedClient) : m.client === selectedClient) && 
                      m.role === 'commercial'
                    ).map(comm => {
                      const assignedAssistants = members.filter(m => 
                        (Array.isArray(m.client) ? m.client.includes(selectedClient) : m.client === selectedClient) && 
                        m.role === 'funebooster' && 
                        (m.permissions?.assigned_commercials || []).includes(comm.name)
                      );

                      return (
                        <div key={comm.id} className="glass-panel p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center text-secondary font-black text-sm uppercase">
                                {comm.name?.substring(0, 2)}
                              </div>
                              <div>
                                <p className="text-xl font-extrabold font-outfit text-navy">{comm.name}</p>
                                <p className="text-[11px] font-bold text-navy/20 font-mono tracking-wider">{comm.identifier}</p>
                              </div>
                            </div>
                            <span className="px-4 py-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-extrabold font-outfit uppercase tracking-widest">Commercial</span>
                          </div>

                          <div className="pt-6 border-t border-navy/5 space-y-4">
                            <p className="text-[9px] font-black text-navy/30 uppercase tracking-widest ml-1">Assistants Funboosters assignés :</p>
                            <div className="flex flex-wrap gap-3">
                              {assignedAssistants.length > 0 ? assignedAssistants.map(ast => (
                                <div key={ast.id} className="flex items-center gap-3 bg-primary/5 px-4 py-3 rounded-2xl border border-primary/10">
                                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] uppercase">
                                    {ast.name?.substring(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-navy">{ast.name}</p>
                                    <p className="text-[8px] font-bold text-primary/40 uppercase tracking-[0.2em]">Assistante</p>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-[10px] font-bold text-navy/20 italic ml-1">Aucun assistant assigné</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All Assistants List */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 ml-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-primary" /></div>
                    <h4 className="text-xs font-black text-navy uppercase tracking-widest">Tous les Funboosters</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {members.filter(m => 
                      (Array.isArray(m.client) ? m.client.includes(selectedClient) : m.client === selectedClient) && 
                      m.role === 'funebooster'
                    ).map(ast => (
                      <div key={ast.id} className="glass-panel p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all flex items-center gap-4 relative overflow-hidden group">
<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-xs uppercase">
                          {ast.name?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-base font-extrabold font-outfit text-navy">{ast.name}</p>
                          <p className="text-[10px] font-bold text-navy/20 font-mono tracking-wider">{ast.identifier}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'cabinet' ? (
            <div className="p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4">
              {selectedClient ? (
                /* Client Detail View */
                <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setSelectedClient(null)} 
                      className="p-3 rounded-2xl bg-navy/5 text-navy hover:bg-navy hover:text-white transition-all shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div>
                      <h2 className="text-3xl font-black text-navy tracking-tight">{selectedClient}</h2>
                      <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.25em] mt-1">Collaborateurs assignés à cette entité</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.filter(m => Array.isArray(m.client) ? m.client.includes(selectedClient) : m.client === selectedClient).map(member => (
                      <div key={member.id} className="glass-panel p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group flex items-center gap-4 relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center text-navy font-black text-sm uppercase group-hover:bg-primary group-hover:text-white transition-all">
                          {member.name?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-navy">{member.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                              member.role === 'admin' ? 'bg-active text-white' : 
                              member.role === 'funebooster' ? 'bg-primary/10 text-primary' : 
                              'bg-secondary/10 text-secondary'
                            }`}>{member.role}</span>
                            <span className="text-[9px] font-bold text-navy/20 font-mono">{member.identifier}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {members.filter(m => m.client === selectedClient).length === 0 && (
                      <div className="col-span-full py-20 flex flex-col items-center justify-center text-navy/20 gap-3 grayscale opacity-40">
                        <Users className="w-12 h-12" />
                        <p className="text-xs font-black uppercase tracking-widest">Aucun collaborateur trouvé</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Cabinet Dashboard View */
                <>
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 rounded-[2rem] bg-navy/5 flex items-center justify-center text-navy font-black text-3xl shadow-inner">
                      {currentUser?.name?.substring(0, 2)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-navy">{currentUser?.name}</h2>
                        <span className="px-3 py-1 rounded-lg bg-active text-white text-[10px] font-black uppercase tracking-widest">{currentUser?.role?.toUpperCase()}</span>
                      </div>
                      <p className="text-navy/40 font-bold flex items-center gap-2">
                        <Mail className="w-4 h-4" /> {currentUser?.email}
                      </p>
                      <p className="text-xs font-mono font-bold text-navy/20 uppercase tracking-widest">ID: {currentUser?.identifier || 'NON DÉFINI'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="glass-panel p-8 rounded-[2rem] border border-navy/5 bg-navy/[0.01] space-y-4">
                      <h4 className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em]">Mes Accès & Permissions</h4>
                      <ul className="space-y-3">
                        {isAdmin ? (
                          <>
                            <li className="flex items-center gap-3 text-sm font-bold text-navy"><Check className="w-4 h-4 text-green-500" /> Accès complet à la base de données</li>
                            <li className="flex items-center gap-3 text-sm font-bold text-navy"><Check className="w-4 h-4 text-green-500" /> Gestion des utilisateurs et équipes</li>
                            <li className="flex items-center gap-3 text-sm font-bold text-navy"><Check className="w-4 h-4 text-green-500" /> Configuration des workflows et pipelines</li>
                          </>
                        ) : (
                          <>
                            {currentUser?.permissions?.view_leads && <li className="flex items-center gap-3 text-sm font-bold text-navy"><Check className="w-4 h-4 text-green-500" /> Consultation des Leads</li>}
                            {currentUser?.permissions?.view_agenda && <li className="flex items-center gap-3 text-sm font-bold text-navy"><Check className="w-4 h-4 text-green-500" /> Accès à l'Agenda</li>}
                            {currentUser?.permissions?.view_pipeline && <li className="flex items-center gap-3 text-sm font-bold text-navy"><Check className="w-4 h-4 text-green-500" /> Accès au Pipeline</li>}
                            {currentUser?.permissions?.view_zone_temp && <li className="flex items-center gap-3 text-sm font-bold text-navy"><Check className="w-4 h-4 text-green-500" /> Consultation Zone Temp</li>}
                          </>
                        )}
                      </ul>
                    </div>
                    
                    {isAdmin && (
                      <div className="glass-panel p-8 rounded-[2rem] border border-navy/5 bg-navy/[0.01] space-y-4">
                        <h4 className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em]">Statistiques Équipe</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-card p-4 rounded-2xl border border-navy/5 shadow-sm">
                            <p className="text-2xl font-black text-navy">{members.filter(m => m.role === 'funebooster').length}</p>
                            <p className="text-[9px] font-bold text-navy/30 uppercase">FunBoosters</p>
                          </div>
                          <div className="bg-card p-4 rounded-2xl border border-navy/5 shadow-sm">
                            <p className="text-2xl font-black text-navy">{members.filter(m => m.role === 'commercial').length}</p>
                            <p className="text-[9px] font-bold text-navy/30 uppercase">Commerciaux</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mes Clients Section */}
                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-3 ml-2">
                      <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center"><Building2 className="w-4 h-4 text-navy/40" /></div>
                      <h4 className="text-xs font-black text-navy uppercase tracking-widest">Mes Clients</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                      {allClients.map(clientObj => {
                        const client = clientObj.name;
                        const count = members.filter(m => 
                          Array.isArray(m.client) ? m.client.includes(client) : m.client === client
                        ).length;
                        return (
                          <button 
                            key={clientObj.id} 
                            onClick={() => setSelectedClient(client)}
                            className="glass-panel p-6 rounded-[2rem] shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all flex flex-col gap-4 group text-left relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-br from-active/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /><div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-inner">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-navy uppercase tracking-tight leading-tight">{client}</p>
                              <p className="text-[9px] font-bold text-navy/20 uppercase tracking-widest mt-1">{count} Collaborateurs</p>
                            </div>
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
                              <ChevronRight className="w-5 h-5 text-primary" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy/[0.01] border-b border-navy/5">
                  <th className="px-8 py-4 text-[10px] font-black text-navy/30 uppercase tracking-widest">Utilisateur</th>
                  <th className="px-8 py-4 text-[10px] font-black text-navy/30 uppercase tracking-widest">Identifiant</th>
                  <th className="px-8 py-4 text-[10px] font-black text-navy/30 uppercase tracking-widest">Rôle</th>
                  <th className="px-8 py-4 text-[10px] font-black text-navy/30 uppercase tracking-widest">Email</th>
                  <th className="px-8 py-4 text-[10px] font-black text-navy/30 uppercase tracking-widest">Téléphone</th>
                  <th className="px-8 py-4 text-[10px] font-black text-navy/30 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-8 py-4 text-[10px] font-black text-navy/30 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filteredMembers.map(member => (
                  <tr key={member.id} className="hover:bg-navy/[0.01] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy font-black text-xs uppercase">
                          {member.name?.substring(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-navy">{member.name}</span>
                          {member.client && (
                            <span className="text-[9px] font-bold text-primary uppercase">
                              {Array.isArray(member.client) ? member.client.join(', ') : member.client}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-mono font-bold text-navy/60">{member.identifier || '—'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-extrabold font-outfit uppercase tracking-widest border transition-all ${
                        member.role === 'funebooster' ? 'bg-primary/5 text-primary border-primary/10' : 
                        member.role === 'commercial' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        'bg-active text-white border-active'
                      }`}>
                        {member.role === 'funebooster' ? 'Assistante commerciale' : 
                         member.role === 'commercial' ? 'Commerciale' : member.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-navy/40">{member.email}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-navy/40">{member.phone || '—'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => teamService.updateMember(member.id, { is_active: !member.is_active }).then(fetchMembers)}
                          className={`w-10 h-5 rounded-full transition-all p-1 flex items-center ${member.is_active ? 'bg-green-500' : 'bg-navy/20'}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${member.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingMember(member); setIsEditModalOpen(true); }}
                          className="p-2 hover:bg-navy/5 rounded-lg text-navy/40 hover:text-navy transition-all"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => window.confirm('Supprimer cet utilisateur ?') && teamService.deleteMember(member.id).then(fetchMembers)}
                          className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-navy uppercase tracking-tight">Nouveau Client</h3>
                  <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.25em] mt-1">Configuration de l'entité</p>
                </div>
                <button onClick={() => setIsClientModalOpen(false)} className="p-3 rounded-2xl bg-navy/5 text-navy/30 hover:bg-navy hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">Nom du Client</label>
                  <input 
                    type="text" 
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    placeholder="Ex: TB FORMATIONS"
                    className="w-full px-6 py-4 bg-navy/[0.02] border border-navy/5 rounded-2xl text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-navy/10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">Préfixe Identifiant (6 chars)</label>
                  <input 
                    type="text" 
                    value={newClient.prefix}
                    onChange={(e) => setNewClient({...newClient, prefix: e.target.value.toUpperCase()})}
                    placeholder="Ex: TB1001"
                    maxLength={10}
                    className="w-full px-6 py-4 bg-navy/[0.02] border border-navy/5 rounded-2xl text-sm font-mono font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-navy/10"
                    required
                  />
                  <p className="text-[9px] font-medium text-navy/20 ml-1 italic">Ce préfixe sera utilisé pour générer les IDs des collaborateurs.</p>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-5 bg-primary text-white rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Création...' : 'Créer le Client'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Member Modal - Redesigned to Full Page / Professional Style */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          
          <div className="bg-[#f8f9fc] h-full w-full max-w-5xl relative z-10 shadow-[0_30px_100px_rgba(0,0,0,0.2)] flex flex-col animate-in zoom-in-95 duration-500 rounded-[3rem] overflow-hidden border border-white">
            
            {/* Modal Header */}
            <div className="px-10 py-8 bg-white border-b border-navy/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-navy/5 flex items-center justify-center text-navy font-black text-xl shadow-inner">
                  {editingMember.name?.substring(0, 2) || editingMember.role?.substring(0, 2) || '??'}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-navy tracking-tight">
                    {editingMember.id ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}
                  </h3>
                  <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.25em] mt-1">Configuration des Accès & Profil Collaborateur</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-4 hover:bg-navy/5 rounded-2xl transition-all group">
                <X className="w-6 h-6 text-navy/20 group-hover:text-navy transition-colors" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="flex-1 overflow-y-auto p-10 md:p-14 space-y-14 custom-scrollbar">
              
              {/* Section: Connexion */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                  <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center"><Lock className="w-4 h-4 text-navy/40" /></div>
                  <h4 className="text-xs font-black text-navy uppercase tracking-widest">Informations de connexion</h4>
                </div>
                <div className="grid grid-cols-2 gap-10 bg-white p-10 rounded-[2.5rem] border border-navy/5 shadow-sm">
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] font-black text-navy/30 uppercase tracking-[0.15em] ml-1">Identifiant</label>
                    <div className="bg-navy/[0.03] border-none rounded-2xl px-5 py-4 text-sm font-bold text-navy/40">
                      {editingMember.identifier || 'Généré automatiquement...'}
                    </div>
                  </div>
                  <CompactInput label="Mot de passe" type="password" value={editingMember.password} onChange={(v) => setEditingMember({...editingMember, password: v})} placeholder="••••••••" />
                </div>
              </section>

              {/* Section: Identity */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                  <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center"><User className="w-4 h-4 text-navy/40" /></div>
                  <h4 className="text-xs font-black text-navy uppercase tracking-widest">Informations de l'utilisateur</h4>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-navy/5 shadow-sm space-y-10">
                  <div className="flex items-center gap-4">
                    <GenderToggle active={editingMember.gender === 'Monsieur'} label="Monsieur" onClick={() => setEditingMember({...editingMember, gender: 'Monsieur'})} />
                    <GenderToggle active={editingMember.gender === 'Madame'} label="Madame" onClick={() => setEditingMember({...editingMember, gender: 'Madame'})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                    <CompactInput label="Nom Complet" value={editingMember.name} onChange={(v) => setEditingMember({...editingMember, name: v})} placeholder="Jean Dupont" />
                    <CompactInput label="E-mail" type="email" value={editingMember.email} onChange={(v) => setEditingMember({...editingMember, email: v})} placeholder="jean@lykos.fr" />
                    <CompactInput label="Téléphone" value={editingMember.phone} onChange={(v) => setEditingMember({...editingMember, phone: v})} placeholder="06 12 34 56 78" />
                    {(editingMember.role === 'commercial' || editingMember.role === 'funebooster') && (
                      <div className="col-span-full space-y-4">
                        <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">Clients Assignés</label>
                        <div className="flex flex-wrap gap-2">
                          {allClients.map(clientObj => {
                            const c = clientObj.name;
                            let currentClients = [];
                            if (Array.isArray(editingMember.client)) {
                              currentClients = editingMember.client;
                            } else if (typeof editingMember.client === 'string') {
                              if (editingMember.client.startsWith('[')) {
                                try {
                                  currentClients = JSON.parse(editingMember.client);
                                } catch (e) {
                                  currentClients = [editingMember.client];
                                }
                              } else {
                                currentClients = editingMember.client ? [editingMember.client] : [];
                              }
                            }
                            
                            const isSelected = currentClients.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  const next = isSelected 
                                    ? currentClients.filter(item => item !== c) 
                                    : [...currentClients, c];
                                  
                                  // Keep only commercials that still have at least one client in common with the new list
                                  const nextAssigned = (editingMember.permissions?.assigned_commercials || []).filter(commName => {
                                    const comm = members.find(m => m.name === commName && m.role === 'commercial');
                                    if (!comm) return false;
                                    const commClients = Array.isArray(comm.client) ? comm.client : [comm.client];
                                    return commClients.some(cc => next.includes(cc));
                                  });

                                  setEditingMember({
                                    ...editingMember, 
                                    client: next,
                                    permissions: {
                                      ...editingMember.permissions,
                                      assigned_commercials: nextAssigned
                                    }
                                  });
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                                  isSelected 
                                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' 
                                    : 'bg-white text-navy/40 border-navy/10 hover:border-navy/20'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                {c}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {editingMember.role === 'funebooster' && editingMember.client?.length > 0 && (
                      <div className="col-span-full p-6 bg-navy/[0.02] border border-navy/5 rounded-3xl animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1 mb-4 block">Commerciaux à alimenter</label>
                        <div className="flex flex-wrap gap-2">
                          {members.filter(m => {
                            const memberClients = Array.isArray(m.client) ? m.client : (m.client ? [m.client] : []);
                            const editingClients = Array.isArray(editingMember.client) ? editingMember.client : [editingMember.client];
                            return m.role === 'commercial' && memberClients.some(c => editingClients.includes(c));
                          }).length === 0 ? (
                            <span className="text-xs text-navy/40 italic">Aucun commercial trouvé pour ces clients.</span>
                          ) : (
                            members.filter(m => {
                              const memberClients = Array.isArray(m.client) ? m.client : (m.client ? [m.client] : []);
                              const editingClients = Array.isArray(editingMember.client) ? editingMember.client : [editingMember.client];
                              return m.role === 'commercial' && memberClients.some(c => editingClients.includes(c));
                            }).map(comm => {
                              const isAssigned = (editingMember.permissions?.assigned_commercials || []).includes(comm.name);
                              return (
                                <button
                                  key={comm.id}
                                  type="button"
                                  onClick={() => {
                                    let current = editingMember.permissions?.assigned_commercials || [];
                                    const next = isAssigned ? current.filter(c => c !== comm.name) : [...current, comm.name];
                                    setEditingMember({...editingMember, permissions: {...editingMember.permissions, assigned_commercials: next}});
                                  }}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                                    isAssigned 
                                      ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' 
                                      : 'bg-white text-navy/40 border-navy/10 hover:border-navy/20'
                                  }`}
                                >
                                  {isAssigned && <Check className="w-3.5 h-3.5" />}
                                  {comm.name}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Section: Permissions */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                  <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-navy/40" /></div>
                  <h4 className="text-xs font-black text-navy uppercase tracking-widest">Accès & Permissions</h4>
                </div>
                
                <div className="space-y-4">
                  {PERMISSION_KEYS.map(perm => {
                    const isActive = editingMember.permissions?.[perm.id];
                    const clientsKey = perm.id === 'view_agenda' ? 'agenda_clients' : 'pipeline_clients';
                    const selectedClients = editingMember.permissions?.[clientsKey] || [];

                    const toggleClient = (client) => {
                      let current = selectedClients;
                      if (current.includes('all')) current = [];
                      const next = current.includes(client) 
                        ? current.filter(c => c !== client)
                        : [...current, client];
                      setEditingMember({...editingMember, permissions: {...editingMember.permissions, [clientsKey]: next}});
                    };

                    const toggleAllClients = () => {
                      const next = selectedClients.includes('all') ? [] : ['all'];
                      setEditingMember({...editingMember, permissions: {...editingMember.permissions, [clientsKey]: next}});
                    };

                    return (
                      <div key={perm.id} className="bg-white rounded-[2rem] border border-navy/5 shadow-sm overflow-hidden transition-all hover:border-navy/10">
                        {/* Toggle Row */}
                        <div className={`flex items-center justify-between px-8 py-6 transition-all ${
                          isActive ? 'bg-navy/[0.01]' : 'bg-white'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${isActive ? 'bg-primary/10 text-primary' : 'bg-navy/5 text-navy/20'}`}>
                              <perm.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className={`text-sm font-black uppercase tracking-wider ${isActive ? 'text-navy' : 'text-navy/30'}`}>{perm.label}</span>
                              <p className="text-[9px] font-bold text-navy/20 uppercase tracking-widest mt-0.5">
                                {isActive ? 'Accès activé' : 'Accès restreint'}
                              </p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => togglePermission(perm.id)}
                            className={`w-14 h-7 rounded-full transition-all p-1 flex items-center ${isActive ? 'bg-green-500' : 'bg-navy/10'}`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all transform ${isActive ? 'translate-x-7' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Client filter (Agenda & Pipeline) */}
                        {perm.hasClients && isActive && (
                          <div className="px-8 pb-8 pt-2 border-t border-navy/[0.03] bg-navy/[0.01] animate-in slide-in-from-top-2 duration-300">
                            <p className="text-[9px] font-black text-navy/30 uppercase tracking-widest mb-4 ml-1">Entités Clients autorisées</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={toggleAllClients}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                                  selectedClients.includes('all') ? 'bg-active text-white border-transparent' : 'bg-white border-navy/10 text-navy/40 hover:border-navy/20'
                                }`}
                              >Tous les clients</button>
                                {allClients.map(clientObj => {
                                  const client = clientObj.name;
                                  return (
                                    <button
                                      key={clientObj.id}
                                      type="button"
                                      onClick={() => toggleClient(client)}
                                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                                        selectedClients.includes(client) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-white border-navy/10 text-navy/40 hover:border-navy/20'
                                      }`}
                                    >{client}</button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Column filter (Leads) */}
                        {perm.hasColumns && isActive && (
                          <div className="px-8 pb-8 pt-4 border-t border-navy/[0.03] bg-navy/[0.01] animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-6 ml-1">
                              <p className="text-[9px] font-black text-navy/30 uppercase tracking-widest">Colonnes visibles dans le CRM</p>
                              <button
                                type="button"
                                onClick={toggleAllColumns}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                                  (editingMember.permissions?.leads_columns || []).includes('all') ? 'bg-active text-white border-transparent shadow-lg shadow-active/20' : 'bg-white border-navy/10 text-navy/40 hover:border-navy/20'
                                }`}
                              >Toutes les colonnes</button>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {ALL_COLUMNS.map(col => (
                                <ColumnCheckbox 
                                  key={col.key}
                                  label={col.label}
                                  active={(editingMember.permissions?.leads_columns || []).includes(col.key) || (editingMember.permissions?.leads_columns || []).includes('all')}
                                  onClick={() => toggleColumn(col.key)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </form>

            {/* Modal Footer */}
            <div className="px-10 py-8 bg-white border-t border-navy/5 flex items-center justify-end gap-4">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-8 py-4 text-navy/40 text-[11px] font-black uppercase tracking-widest hover:bg-navy/5 rounded-2xl transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveMember}
                disabled={saving}
                className="px-12 py-4 bg-active text-white font-black rounded-2xl shadow-2xl shadow-active/20 hover:bg-active/90 active:scale-[0.98] transition-all uppercase tracking-widest text-[13px] flex items-center justify-center gap-3 min-w-[240px]"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2.5 rounded-[1.5rem] flex items-center gap-2 transition-all duration-300 ${
      active ? 'bg-white text-navy shadow-lg border border-navy/5' : 'text-navy/40 hover:text-navy/60'
    }`}
  >
    <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
    <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{label}</span>
  </button>
);

const FormItem = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-navy/30 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-navy/5 border border-navy/10 rounded-2xl px-5 py-3.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-navy/20"
    />
  </div>
);

const CompactInput = ({ label, value, onChange, type = 'text', placeholder }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[10px] font-black text-navy/30 uppercase tracking-[0.15em] ml-1">{label}</label>
      <div className="relative group">
        <input 
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-navy/[0.03] border-none rounded-2xl px-6 py-4 text-[13px] font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-navy/20 pr-14"
        />
        {isPassword && (
          <button 
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-navy/5 rounded-xl text-navy/20 hover:text-navy transition-all"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const GenderToggle = ({ active, label, onClick }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`px-8 py-3.5 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-wider flex items-center gap-3 ${
      active ? 'bg-navy border-navy text-white shadow-xl shadow-navy/20' : 'bg-white border-navy/5 text-navy/30 hover:border-navy/10 hover:bg-navy/[0.01]'
    }`}
  >
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-white' : 'border-navy/10'}`}>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
    {label}
  </button>
);

const PermissionToggle = ({ icon: Icon, label, active, onClick }) => (
  <div className="flex items-center justify-between p-4 bg-navy/[0.02] border border-navy/5 rounded-2xl group hover:border-primary/20 transition-all">
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-lg ${active ? 'bg-primary/10 text-primary' : 'bg-navy/5 text-navy/30'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={`text-[11px] font-black uppercase tracking-widest ${active ? 'text-navy' : 'text-navy/30'}`}>
        {label}
      </span>
    </div>
    <button 
      type="button"
      onClick={onClick}
      className={`w-12 h-6 rounded-full transition-all p-1 flex items-center ${active ? 'bg-green-500' : 'bg-navy/10'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-all transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const ColumnCheckbox = ({ label, active, onClick }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all group ${
      active ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white border-navy/5 text-navy/40 hover:border-navy/10'
    }`}
  >
    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
      active ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-navy/[0.02] border-navy/10 group-hover:border-navy/20'
    }`}>
      {active && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
    </div>
    <span className="text-[11px] font-black uppercase tracking-wider truncate">{label}</span>
  </button>
);

export default TeamList;
