<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header avec profil sélectionné -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div 
              class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer group relative"
              title="TeachDigital"
            >
              <span class="text-white font-bold text-lg">TD</span>
              <!-- Tooltip -->
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                TeachDigital
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Centre de notifications -->
            <NotificationCenter />
            
            <!-- Profil actuel -->
            <div v-if="currentProfile" class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="currentProfile.bgColor">
                <span class="text-white text-sm font-semibold">{{ currentProfile.initial }}</span>
              </div>
              <span class="text-gray-700 font-medium">{{ currentProfile.name }}</span>
            </div>
            <div v-else class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                <span class="text-white text-sm font-semibold">?</span>
              </div>
              <span class="text-gray-700 font-medium">Chargement...</span>
            </div>
            
            <!-- Bouton changer de profil -->
            <button 
              @click="changeProfile"
              class="p-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="Changer de profil"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </button>
            
            <!-- Bouton de déconnexion -->
            <button 
              @click="logout"
              class="p-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Se déconnecter"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-12">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold text-gray-800 mb-4">
          Bienvenue {{ currentProfile?.name || 'Chargement...' }} !
        </h2>
        <p class="text-xl text-gray-600">
          {{ currentProfile?.welcomeMessage || 'Chargement du profil...' }}
        </p>
      </div>

      <!-- Indicateur de chargement -->
      <div v-if="isLoadingProfile" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Chargement du profil...</p>
        <p class="mt-2 text-sm text-gray-500">Veuillez patienter...</p>
      </div>

      <!-- Fonctionnalités d'administration pour les parents -->
      <div v-if="currentProfile && (currentProfile.isAdmin || currentProfile.name === 'Parent' || currentProfile.id === '1' || currentProfile.id === 1)" class="mt-8">
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Gérer les profils -->
          <div @click="manageProfiles" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-500">
                <Icon icon="mdi:account-group" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Gérer les profils</h3>
            </div>
            <p class="text-gray-600 mb-4">Configurez et gérez les profils de votre famille</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Administration</span>
              <button class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                Accéder
              </button>
            </div>
          </div>

          <!-- Scanner des leçons -->
          <div @click="openLessonScanner" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-500">
                <Icon icon="mdi:scanner" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Scanner des leçons</h3>
            </div>
            <p class="text-gray-600 mb-4">Créez des quiz à partir d'images et documents</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">IA & Quiz</span>
              <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Scanner
              </button>
            </div>
          </div>

          <!-- Gérer les interrogations -->
          <div @click="openQuizManagement" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-500">
                <Icon icon="mdi:quiz" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Gérer les interrogations</h3>
            </div>
            <p class="text-gray-600 mb-4">Organisez et suivez les quiz des enfants</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Gestion</span>
              <button class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                Gérer
              </button>
            </div>
          </div>

          <!-- Quiz à partir de texte -->
          <div @click="openTextQuizGenerator" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-500">
                <Icon icon="mdi:text-box" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Quiz à partir de texte</h3>
            </div>
            <p class="text-gray-600 mb-4">Générez des quiz depuis du texte libre</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Création</span>
              <button class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                Créer
              </button>
            </div>
          </div>

          <!-- Test de sécurité -->
          <div @click="openSecurityTest" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-red-500">
                <Icon icon="mdi:shield-check" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Test de sécurité</h3>
            </div>
            <p class="text-gray-600 mb-4">Vérifiez la sécurité du système</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Sécurité</span>
              <button class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                Tester
              </button>
            </div>
          </div>

          <!-- Test des notifications -->
          <div @click="openNotificationTest" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-500">
                <Icon icon="mdi:bell-ring" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Test des notifications</h3>
            </div>
            <p class="text-gray-600 mb-4">Testez le système de notifications</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Test</span>
              <button class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                Tester
              </button>
            </div>
          </div>


          <!-- Suivi des progrès -->
          <div @click="openProgressTracking" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-green-500">
                <Icon icon="mdi:chart-line" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Suivi des progrès</h3>
            </div>
            <p class="text-gray-600 mb-4">Consultez les statistiques d'apprentissage</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Statistiques</span>
              <button class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                Consulter
              </button>
            </div>
          </div>

          <!-- Paramètres -->
          <div @click="openParentSettings" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-slate-500">
                <Icon icon="mdi:cog" class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Paramètres</h3>
            </div>
            <p class="text-gray-600 mb-4">Configurez les paramètres de l'application</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Configuration</span>
              <button class="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors">
                Configurer
              </button>
            </div>
          </div>

          <!-- Gestion des activités -->
          <div @click="openActivityManagement" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-cyan-500">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Gestion des activités</h3>
            </div>
            <p class="text-gray-600 mb-4">Organisez les activités des enfants</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Organisation</span>
              <button class="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">
                Organiser
              </button>
            </div>
          </div>

          <!-- Vidéos YouTube -->
          <div @click="openYouTubeManager" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-red-600">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Vidéos YouTube</h3>
            </div>
            <p class="text-gray-600 mb-4">Gérez les vidéos éducatives</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Médias</span>
              <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Gérer
              </button>
            </div>
          </div>

          <!-- Gestion des badges -->
          <div @click="openBadgeManager" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-500">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 ml-4">Gestion des badges</h3>
            </div>
            <p class="text-gray-600 mb-4">Créez et gérez les badges de réussite</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Gamification</span>
              <button class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                Gérer
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Affichage de la version -->
    <VersionInfo position="bottom-right" />
    <MigrationControl />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'
import NotificationCenter from './NotificationCenter.vue'
import VersionInfo from './VersionInfo.vue'
import MigrationControl from './MigrationControl.vue'
import { Icon } from '@iconify/vue'

export default {
  name: 'Dashboard',
  components: {
    NotificationCenter,
    VersionInfo,
    MigrationControl,
    Icon
  },
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      profiles: {
        parent: {
          name: 'Parent',
          initial: 'P',
          bgColor: 'bg-teal-500',
          isAdmin: true,
          welcomeMessage: 'Gérez l\'apprentissage de votre famille',
          courses: []
        },
        ayna: {
          name: 'Ayna',
          initial: 'A',
          bgColor: 'bg-purple-500',
          isAdmin: false,
          welcomeMessage: 'Découvre de nouveaux cours passionnants !',
          courses: [
            {
              id: 1,
              title: 'Programmation créative',
              description: 'Apprends à créer des animations et des jeux',
              duration: '2h',
              color: 'bg-purple-500',
              icon: 'mdi:code-braces'
            },
            {
              id: 2,
              title: 'Design numérique',
              description: 'Crée des designs modernes et attrayants',
              duration: '1h30',
              color: 'bg-pink-500',
              icon: 'mdi:palette'
            }
          ]
        },
        nolann: {
          name: 'Nolann',
          initial: 'N',
          bgColor: 'bg-red-500',
          isAdmin: false,
          welcomeMessage: 'Prêt pour de nouvelles aventures numériques ?',
          courses: [
            {
              id: 1,
              title: 'Robots et IA',
              description: 'Découvre le monde fascinant de la robotique',
              duration: '1h',
              color: 'bg-red-500',
              icon: 'mdi:robot'
            },
            {
              id: 2,
              title: 'Mathématiques amusantes',
              description: 'Apprends les maths en jouant',
              duration: '45 min',
              color: 'bg-blue-500',
              icon: 'mdi:calculator'
            }
          ]
        },
        elyo: {
          name: 'Elyo',
          initial: 'E',
          bgColor: 'bg-green-500',
          isAdmin: false,
          welcomeMessage: 'Explorons ensemble le monde numérique !',
          courses: [
            {
              id: 1,
              title: 'Découverte des couleurs',
              description: 'Apprends les couleurs avec des jeux interactifs',
              duration: '30 min',
              color: 'bg-green-500',
              icon: 'mdi:palette-outline'
            },
            {
              id: 2,
              title: 'Formes et motifs',
              description: 'Reconnais les formes et crée des motifs',
              duration: '25 min',
              color: 'bg-yellow-500',
              icon: 'mdi:shape'
            }
          ]
        }
      },
      currentProfile: null
    }
  },
  computed: {
    isLoadingProfile() {
      return !this.currentProfile
    }
  },
  async created() {
    console.log('🚀 [DASHBOARD] Initialisation du dashboard')
    await this.loadCurrentProfile()
    
    // S'assurer qu'un profil est toujours disponible
    if (!this.currentProfile) {
      console.warn('⚠️ [DASHBOARD] Aucun profil trouvé, utilisation du profil parent par défaut')
      this.currentProfile = this.profiles.parent
    }
    
    // S'assurer que le profil parent a les droits d'admin et ses propriétés par défaut
    if (this.currentProfile && (this.currentProfile.name === 'Parent' || this.currentProfile.id === '1' || this.currentProfile.id === 1)) {
      this.currentProfile.isAdmin = true
      // S'assurer que le profil parent a ses propriétés par défaut
      if (!this.currentProfile.welcomeMessage) {
        this.currentProfile.welcomeMessage = 'Gérez l\'apprentissage de votre famille'
      }
      if (!this.currentProfile.courses) {
        this.currentProfile.courses = this.profiles.parent.courses
      }
      console.log('✅ [DASHBOARD] Droits admin et propriétés par défaut confirmés pour le profil parent')
    }
    
    console.log('🏁 [DASHBOARD] Profil final dans created():', this.currentProfile)
  },
  methods: {
    async loadCurrentProfile() {
      try {
        console.log('👤 [DASHBOARD] Début du chargement du profil')
        
        // Récupérer le profil depuis les paramètres d'URL ou localStorage
        const profileId = this.$route.query.profile
        console.log('🔍 [DASHBOARD] ProfileId depuis URL:', profileId)
        console.log('🔍 [DASHBOARD] Paramètres de route complets:', this.$route.query)
        
        if (profileId) {
          console.log('📚 [DASHBOARD] Chargement du profil depuis la base de données...')
          // Charger le profil depuis la base de données
          await this.profileStore.loadProfile(profileId)
          this.currentProfile = this.profileStore.currentProfile
          console.log('📊 [DASHBOARD] Profil chargé depuis la base de données:', this.currentProfile)
          
          // Si le profil n'est pas trouvé, utiliser le profil parent par défaut
          if (!this.currentProfile) {
            console.warn('⚠️ [DASHBOARD] Profil non trouvé dans la base de données, utilisation du profil parent par défaut')
            this.currentProfile = this.profiles.parent
          }
        } else {
          // Profil par défaut
          console.log('🏠 [DASHBOARD] Aucun profileId, utilisation du profil parent par défaut')
          this.currentProfile = this.profiles.parent
        }
        
        // S'assurer que le profil parent a les droits d'admin et ses propriétés par défaut
        if (this.currentProfile && (this.currentProfile.name === 'Parent' || this.currentProfile.id === '1' || this.currentProfile.id === 1)) {
          this.currentProfile.isAdmin = true
          // S'assurer que le profil parent a ses propriétés par défaut
          if (!this.currentProfile.welcomeMessage) {
            this.currentProfile.welcomeMessage = 'Gérez l\'apprentissage de votre famille'
          }
          if (!this.currentProfile.courses) {
            this.currentProfile.courses = this.profiles.parent.courses
          }
          console.log('✅ [DASHBOARD] Droits admin et propriétés par défaut accordés au profil parent')
        }
        
        console.log('🏁 [DASHBOARD] Profil final utilisé:', this.currentProfile)
        console.log('🔍 [DASHBOARD] État du profil:', {
          hasProfile: !!this.currentProfile,
          profileName: this.currentProfile?.name,
          profileId: this.currentProfile?.id,
          isAdmin: this.currentProfile?.isAdmin,
          hasWelcomeMessage: !!this.currentProfile?.welcomeMessage,
          welcomeMessage: this.currentProfile?.welcomeMessage,
          hasCourses: !!this.currentProfile?.courses,
          coursesCount: this.currentProfile?.courses?.length || 0
        })
      } catch (error) {
        console.error('❌ [DASHBOARD] Erreur lors du chargement du profil:', error)
        // En cas d'erreur, utiliser le profil parent par défaut
        this.currentProfile = this.profiles.parent
        console.log('🔄 [DASHBOARD] Profil de fallback utilisé:', this.currentProfile)
      }
    },
    
    changeProfile() {
      this.$router.push('/')
    },
    manageProfiles() {
      this.$router.push({ 
        path: '/manage-profiles', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openLessonScanner() {
      this.$router.push({ 
        path: '/lesson-scanner', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openQuizManagement() {
      this.$router.push({ 
        path: '/parent-quiz-management', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openTextQuizGenerator() {
      this.$router.push({ 
        path: '/text-quiz-generator', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openSecurityTest() {
      this.$router.push({ 
        path: '/security-test', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openNotificationTest() {
      this.$router.push({ 
        path: '/notification-test', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openProgressTracking() {
      this.$router.push({ 
        path: '/parent-progress-tracking', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openParentSettings() {
      this.$router.push({ 
        path: '/parent-settings', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openActivityManagement() {
      this.$router.push({ 
        path: '/parent-activity-management', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openYouTubeManager() {
      this.$router.push({ 
        path: '/youtube-video-manager', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    openBadgeManager() {
      this.$router.push({ 
        path: '/badge-admin-manager', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    logout() {
      // Effacer la session
      sessionService.clearSession()
      
      // Nettoyer le localStorage
      localStorage.removeItem('selectedProfile')
      
      // Rediriger vers la page de sélection de profil
      this.$router.push('/')
      
      console.log('🚪 Déconnexion effectuée')
    }
  }
}
</script>
