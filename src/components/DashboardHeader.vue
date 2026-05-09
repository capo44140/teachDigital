<template>
  <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
    <nav class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div
            class="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center cursor-pointer group relative backdrop-blur-xl shadow-lg"
            title="TeachDigital"
          >
            <span class="text-white font-bold text-lg">TD</span>
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-slate-800/80 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-white/20">
              TeachDigital
            </div>
          </div>
          <h1 class="text-2xl font-bold text-white hidden sm:block">TeachDigital</h1>
        </div>

        <div class="flex items-center space-x-4">
          <div v-if="profile" class="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 transition-all">
            <div class="w-8 h-8 rounded-lg overflow-hidden border border-white/20 bg-white/10 backdrop-blur-xl">
              <img
                v-if="profileImage"
                :src="profileImage"
                :alt="`Photo de ${profile.name}`"
                class="w-full h-full object-cover"
                loading="lazy"
                referrerpolicy="no-referrer"
              >
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                <span class="text-white text-sm font-semibold">{{ profile.initial }}</span>
              </div>
            </div>
            <span class="text-white font-medium text-sm hidden sm:inline">{{ profile.name }}</span>
          </div>
          <div v-else class="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
              <span class="text-white text-sm font-semibold">?</span>
            </div>
            <span class="text-white/60 font-medium text-sm">Chargement...</span>
          </div>

          <button
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            title="Changer de profil"
            @click="$emit('change-profile')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </button>

          <button
            class="p-2 text-red-400/80 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-xl backdrop-blur-xl hover:bg-red-400/10 transition-all"
            title="Se déconnecter"
            @click="$emit('logout')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>

<script>
export default {
  name: 'DashboardHeader',
  props: {
    profile: { type: Object, default: null },
    profileImage: { type: String, default: null }
  },
  emits: ['change-profile', 'logout']
}
</script>
