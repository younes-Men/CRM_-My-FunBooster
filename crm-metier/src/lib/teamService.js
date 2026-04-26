import { supabase } from './supabase';

/**
 * Service pour gérer les membres de l'équipe
 */
export const teamService = {
  /**
   * Récupérer tous les membres
   */
  async getAllMembers() {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  /**
   * Ajouter un nouveau membre
   */
  async addMember(member) {
    const { data, error } = await supabase
      .from('team_members')
      .insert([member])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Mettre à jour un membre
   */
  async updateMember(id, updates) {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Supprimer un membre
   */
  async deleteMember(id) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  /**
   * Récupérer un membre par son email (pour le login)
   */
  async getMemberByEmail(email) {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('email', email.trim())
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }
};
