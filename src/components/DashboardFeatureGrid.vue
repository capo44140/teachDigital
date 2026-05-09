<template>
  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/manage-profiles')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gérer les profils</h3>
          <p class="text-white/60 text-sm mt-1">Configurez les profils de votre famille</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/lesson-scanner')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Scanner des leçons</h3>
          <p class="text-white/60 text-sm mt-1">Créez des quiz à partir d'images</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/parent-quiz-management')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gérer les interrogations</h3>
          <p class="text-white/60 text-sm mt-1">Organisez et suivez les quiz</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/text-quiz-generator')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Quiz à partir de texte</h3>
          <p class="text-white/60 text-sm mt-1">Générez des quiz depuis du texte</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/security-test')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Test de sécurité</h3>
          <p class="text-white/60 text-sm mt-1">Vérifiez la sécurité du système</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/notification-test')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Test des notifications</h3>
          <p class="text-white/60 text-sm mt-1">Testez le système de notifications</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/parent-progress-tracking')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Suivi des progrès</h3>
          <p class="text-white/60 text-sm mt-1">Consultez les statistiques</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/parent-settings')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Paramètres</h3>
          <p class="text-white/60 text-sm mt-1">Configurez l'application</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/parent-activity-management')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gestion des activités</h3>
          <p class="text-white/60 text-sm mt-1">Organisez les activités</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/youtube-video-manager')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Vidéos YouTube</h3>
          <p class="text-white/60 text-sm mt-1">Gérez les vidéos éducatives</p>
        </div>
      </div>
    </div>

    <div class="glass-card-dashboard group cursor-pointer" @click="navigate('/badge-admin-manager')">
      <div class="flex items-start space-x-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gestion des badges</h3>
          <p class="text-white/60 text-sm mt-1">Créez et gérez les badges</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DashboardFeatureGrid',
  props: {
    profileId: { type: [String, Number], default: '1' }
  },
  methods: {
    navigate(path) {
      this.$router.push({ path, query: { profile: this.profileId, unlocked: 'true' } })
    }
  }
}
</script>
