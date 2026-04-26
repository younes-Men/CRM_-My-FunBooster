import { teamService } from './teamService';

/**
 * Récupère un utilisateur depuis la base de données
 * Note: Cette fonction est asynchrone maintenant.
 */
export const getUser = async (email) => {
  if (!email) return null;
  try {
    return await teamService.getMemberByEmail(email);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
};
