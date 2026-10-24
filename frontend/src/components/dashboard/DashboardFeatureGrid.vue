<template>
  <ul class="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Fonctionnalités de l'espace parent">
    <li v-for="feature in features" :key="feature.path" class="flex">
      <button
        type="button"
        class="glass-card-dashboard group cursor-pointer text-left"
        @click="navigate(feature.path)"
      >
        <span class="flex items-start space-x-4">
          <span
            class="w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
            :class="feature.iconClass"
            aria-hidden="true"
          >
            <svg aria-hidden="true" class="w-6 h-6 text-white" :fill="feature.filled ? 'currentColor' : 'none'" :stroke="feature.filled ? 'none' : 'currentColor'" viewBox="0 0 24 24">
              <path
                v-for="(d, index) in feature.paths"
                :key="index"
                :d="d"
                :stroke-linecap="feature.filled ? undefined : 'round'"
                :stroke-linejoin="feature.filled ? undefined : 'round'"
                :stroke-width="feature.filled ? undefined : 2"
              />
            </svg>
          </span>
          <span class="flex-1">
            <span class="block text-xl font-bold text-white">{{ feature.title }}</span>
            <span class="block text-white/70 text-sm mt-1">{{ feature.description }}</span>
          </span>
        </span>
      </button>
    </li>
  </ul>
</template>

<script>
import { useParentNavigation } from '../../composables/useParentNavigation.js'

const FEATURES = [
  {
    path: '/manage-profiles',
    title: 'Gérer les profils',
    description: 'Configurez les profils de votre famille',
    iconClass: 'from-amber-400 to-amber-500',
    paths: ['M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z']
  },
  {
    path: '/lesson-scanner',
    title: 'Scanner des leçons',
    description: 'Créez des quiz à partir d\'images',
    iconClass: 'from-blue-400 to-cyan-400',
    paths: ['M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12']
  },
  {
    path: '/parent-quiz-management',
    title: 'Gérer les interrogations',
    description: 'Organisez et suivez les quiz',
    iconClass: 'from-purple-400 to-violet-400',
    paths: ['M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4']
  },
  {
    path: '/course-page-manager',
    title: 'Pages de cours',
    description: 'Publiez vos fiches HTML pour un enfant',
    iconClass: 'from-indigo-400 to-sky-400',
    paths: ['M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253']
  },
  {
    path: '/text-quiz-generator',
    title: 'Quiz à partir de texte',
    description: 'Générez des quiz depuis du texte',
    iconClass: 'from-emerald-400 to-teal-400',
    paths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']
  },
  {
    path: '/parent-progress-tracking',
    title: 'Suivi des progrès',
    description: 'Consultez les statistiques',
    iconClass: 'from-green-400 to-emerald-400',
    paths: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z']
  },
  {
    path: '/parent-settings',
    title: 'Paramètres',
    description: 'Configurez l\'application',
    iconClass: 'from-slate-400 to-slate-500',
    paths: [
      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    ]
  },
  {
    path: '/parent-activity-management',
    title: 'Gestion des activités',
    description: 'Organisez les activités',
    iconClass: 'from-cyan-400 to-blue-400',
    paths: ['M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2']
  },
  {
    path: '/youtube-video-manager',
    title: 'Vidéos YouTube',
    description: 'Gérez les vidéos éducatives',
    iconClass: 'from-red-500 to-red-600',
    filled: true,
    paths: ['M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z']
  },
  {
    path: '/parent-game-management',
    title: 'Jeux',
    description: 'Ouvrez Pac-Man et Tetris sous conditions',
    iconClass: 'from-orange-400 to-pink-500',
    paths: ['M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z']
  },
  {
    path: '/badge-admin-manager',
    title: 'Gestion des badges',
    description: 'Créez et gérez les badges',
    iconClass: 'from-yellow-400 to-yellow-500',
    paths: ['M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z']
  }
]

export default {
  name: 'DashboardFeatureGrid',
  setup() {
    const parentNav = useParentNavigation()
    return { parentNav, features: FEATURES }
  },
  methods: {
    navigate(path) {
      this.parentNav.goToParent(path)
    }
  }
}
</script>
