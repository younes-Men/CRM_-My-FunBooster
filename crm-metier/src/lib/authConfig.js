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
};

export const getUser = (email) => {
  const emailLower = email?.trim();
  return USERS_MAP[emailLower] || null;
};
