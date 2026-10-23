/**
 * Authentification : code d'entrée familial, connexion par PIN, déconnexion,
 * vérification du jeton parent et modification des codes (PIN, code familial).
 *
 * Le transport (choix du jeton, erreurs HTTP, délais) est assuré par apiService ;
 * ce service n'appelle que les endpoints /api/auth/* et /api/profiles/:id/pin.
 */

import { apiService, ApiError } from './apiService.js'
import sessionService from './sessionService.js'
import familyGateService from './familyGateService.js'
import { readProfileToken, readProfileUser, storeProfileToken } from './authStorage.js'
import { decodeJwtPayload } from '../utils/jwt.js'

const LOGIN_ENDPOINT = '/api/auth/login'
const FAMILY_GATE_ENDPOINT = '/api/auth/family-gate'

class AuthService {
  /**
   * Vérifier le code d'entrée familial (POST public, sans jeton).
   * 401 INVALID_CREDENTIALS : code incorrect ; 429 FAMILY_GATE_LOCKED : verrouillage ;
   * 503 FAMILY_GATE_NOT_CONFIGURED : aucun code défini côté serveur.
   * @param {string} pin
   * @returns {Promise<Object>} Réponse brute { success, data: { valid, token, expiresAt } }
   */
  async checkFamilyCode (pin) {
    return apiService.request(FAMILY_GATE_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ pin })
    })
  }

  /**
   * Connexion avec profil et code PIN (le serveur exige le jeton famille).
   * Un 401 signifie « code PIN incorrect », sauf code UNAUTHORIZED : session famille expirée,
   * l'erreur porte alors le code SESSION_EXPIRED et le router revient au code familial.
   * Pour un profil administrateur, la session parent (30 min) est ouverte ici.
   */
  async login (profileId, pin) {
    const response = await apiService.request(LOGIN_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ profileId, pin })
    })

    if (!response?.success || !response.data?.token) {
      throw new ApiError(response?.message || 'Erreur de connexion', { status: 200, data: response })
    }

    const { token, profile } = response.data
    const payload = decodeJwtPayload(token)

    // Repartir d'un état propre : un seul jeton profil à la fois
    sessionService.clearSession()
    storeProfileToken(token, profile || null)

    if (payload?.isAdmin === true) {
      const id = payload.profileId ?? profile?.id ?? profileId
      sessionService.createSession(String(id), profile?.name || payload.name || '')
    }
    return response.data
  }

  /**
   * Déconnexion de l'espace parent : supprime le jeton profil et la session parent.
   * La session famille est conservée (retour au choix des profils).
   */
  async logout () {
    const hadToken = !!readProfileToken()
    apiService.clearProfileSession()
    if (!hadToken) return

    try {
      // Jetons sans état côté serveur : appel informatif, ses erreurs sont ignorées
      await apiService.request('/api/auth/logout', { method: 'POST', auth: 'none' })
    } catch (error) {
      console.warn('Erreur de déconnexion (ignorée):', error?.message || error)
    }
  }

  /**
   * Vérifier le jeton profil auprès du serveur (le jeton famille n'est pas un utilisateur connecté)
   * @returns {Promise<Object|null>} Utilisateur du jeton profil, ou null
   */
  async verifyToken () {
    if (!apiService.getProfileToken()) return null
    try {
      const response = await apiService.request('/api/auth/verify', { auth: 'profile' })
      const data = response?.success ? response.data : null
      if (!data?.user) return null
      if (data.scope && data.scope !== 'profile') return null
      return data.user
    } catch {
      // 401 : jeton déjà supprimé par request() ; autre erreur : on réessaiera plus tard
      return null
    }
  }

  /**
   * Mettre à jour un code PIN (seule implémentation de l'application).
   * Le serveur exige le PIN actuel pour modifier son propre PIN. Erreurs 400 possibles :
   * WEAK_PIN (PIN trop simple) et PIN_TOO_SHORT (6 chiffres minimum pour un parent) ;
   * le message du serveur est conservé dans l'erreur.
   */
  async updatePin (profileId, newPin, currentPin = null) {
    const body = { newPin }
    if (currentPin) body.currentPin = currentPin
    const response = await apiService.request(`/api/profiles/${profileId}/pin`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
    if (!response?.success) {
      throw new ApiError(response?.message || 'Impossible de modifier le code PIN', { status: 200, data: response })
    }
    const data = response.data || {}
    // Changement de son propre PIN : l'ancien jeton est révoqué, le nouveau le remplace
    // (la session parent de 30 min reste ouverte : même profil)
    if (typeof data.token === 'string' && data.token) {
      const payload = decodeJwtPayload(data.token)
      const current = apiService.getProfileTokenPayload()
      if (payload && (!current || String(payload.profileId) === String(current.profileId))) {
        storeProfileToken(data.token, readProfileUser())
      }
    }
    return data
  }

  /**
   * Modifier le code d'entrée familial (parent). Tous les jetons famille sont révoqués,
   * y compris celui de cet appareil : le nouveau jeton renvoyé est enregistré.
   * Erreurs : 400 WEAK_PIN / CURRENT_PIN_REQUIRED, 401 INVALID_CURRENT_PIN (pas une déconnexion).
   * @returns {Promise<{ token: string, expiresAt: string }>}
   */
  async updateFamilyCode (currentPin, newPin) {
    const body = { newPin }
    if (currentPin) body.currentPin = currentPin
    const response = await apiService.request(FAMILY_GATE_ENDPOINT, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
    const data = response?.data || {}
    if (!response?.success || !familyGateService.createFamilySession(data)) {
      throw new ApiError(response?.message || 'Le nouveau code n\'a pas pu être enregistré sur cet appareil', { status: 200, data: response })
    }
    return data
  }
}

export { AuthService }
export const authService = new AuthService()
export default authService
