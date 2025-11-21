// ATTENTION: Ce fichier ne doit PAS Ãªtre utilisÃ© cÃ´tÃ© frontend!
// Tous les accÃ¨s base de donnÃ©es doivent passer par l\'API backend

if (typeof window !== 'undefined') {
  console.error('âŒ ERREUR: Tentative d\'accÃ¨s direct Ã  la base de donnÃ©es depuis le frontend!')
  console.error('Utilisez apiService pour communiquer avec l\'API backend Ã  la place.')
  console.warn('Fichiers qui ne devraient pas importer database.js:')
  console.warn('- Services qui accÃ¨dent Ã  sql')
  console.warn('- Repositories qui font des requÃªtes SQL')
}

// CrÃ©er un proxy qui ne crash pas mais loggue les erreurs
const handler = {
  get (target, prop) {
    if (typeof window !== 'undefined') {
      console.warn(`âš ï¸ Tentative d'accÃ¨s Ã  sql.${String(prop)} du frontend`)
      return () => Promise.reject(new Error('AccÃ¨s BD frontend interdit'))
    }
    return target[prop]
  },
  apply (target, thisArg, args) {
    if (typeof window !== 'undefined') {
      console.error('âš ï¸ Tentative d\'appel Ã  sql() du frontend')
      return Promise.reject(new Error('AccÃ¨s BD frontend interdit'))
    }
    return target(...args)
  }
}

const sqlStub = new Proxy(function () {}, handler)

export default sqlStub
export const testConnection = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('AccÃ¨s BD interdite du frontend')
  }
  return false
}
export const initializeDatabase = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('AccÃ¨s BD interdite du frontend')
  }
  return false
}
export const insertTestData = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('AccÃ¨s BD interdite du frontend')
  }
  return false
}
