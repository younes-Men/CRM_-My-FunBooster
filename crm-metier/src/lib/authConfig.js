export const USERS_MAP = {
  'BENZAIDOUNE@docendIA': { name: 'BENZAYDOUNE', role: 'funebooster' },
  'LABIBA@docendIA': { name: 'LABIBA', role: 'funebooster' },
  'ZIGHI@docendIA': { name: 'KHADIJA', role: 'funebooster' },
  'AMRI@docendIA': { name: 'AMRI', role: 'funebooster' },
  'AHANA@docendIA': { name: 'SOUKAINA', role: 'funebooster' },
  'MAFTOUH@docendIA': { name: 'MERYEM', role: 'funebooster' },
  'NOUFOUSSI@docendIA': { name: 'WISSAL', role: 'funebooster' },
  'RIRI@docendIA': { name: 'WIJDAN', role: 'funebooster' },
  'ADMIN@docendIA-2026.IA': { name: 'Admin', role: 'admin' },
  // Commerciaux
  'CA@docendIA': { name: 'Commercial CA', role: 'commercial', client: 'CA CONSEILS' },
  'TB@docendIA': { name: 'Commercial TB', role: 'commercial', client: 'TB FORMATIONS' },
  'GO@docendIA': { name: 'Commercial GO', role: 'commercial', client: 'GO CONSEILS' },
  'HZ@docendIA': { name: 'Commercial HZ', role: 'commercial', client: 'HORS ZONE' },
};

export const getUser = (email) => {
  const emailLower = email?.trim();
  return USERS_MAP[emailLower] || null;
};
