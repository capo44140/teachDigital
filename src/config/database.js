// ATTENTION: Ce fichier n\'est pas destinÃ© Ã  Ãªtre utilisÃ© cÃ´tÃ© frontend
// Tous les accÃ¨s base de donnÃ©es doivent passer par l\'API backend

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  throw new Error('âŒ AccÃ¨s base de donnÃ©es du frontend interdit!');
}

// Stub pour le build
export default class SqlStub {
  constructor() {}
  async toString() { return ''; }
}

export const testConnection = async () => false;
export const initializeDatabase = async () => false;  
export const insertTestData = async () => false;
