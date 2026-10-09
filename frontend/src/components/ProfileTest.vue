<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-8">Test des profils</h1>
      
      <!-- Statistiques -->
      <div class="grid md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Total</h3>
          <p class="text-3xl font-bold text-blue-600">{{ allProfiles.length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Enfants</h3>
          <p class="text-3xl font-bold text-green-600">{{ childProfiles.length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Adolescents</h3>
          <p class="text-3xl font-bold text-purple-600">{{ teenProfiles.length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Non-Admin</h3>
          <p class="text-3xl font-bold text-orange-600">{{ nonAdminProfiles.length }}</p>
        </div>
      </div>

      <!-- Tous les profils -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Tous les profils</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="profile in allProfiles" :key="profile.id" 
               class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center" 
                   :class="getProfileColor(profile)">
                <span class="text-white font-bold">{{ profile.name.charAt(0) }}</span>
              </div>
              <div>
                <h3 class="font-medium text-gray-800">{{ profile.name }}</h3>
                <p class="text-sm text-gray-600">{{ profile.description }}</p>
                <div class="flex space-x-2 mt-2">
                  <span v-if="profile.is_admin" class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Admin</span>
                  <span v-if="profile.is_child" class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Child</span>
                  <span v-if="profile.is_teen" class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Teen</span>
                  <span v-if="profile.is_active" class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Actif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profils enfants uniquement -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Profils enfants (childProfiles)</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="profile in childProfiles" :key="profile.id" 
               class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center" 
                   :class="getProfileColor(profile)">
                <span class="text-white font-bold">{{ profile.name.charAt(0) }}</span>
              </div>
              <div>
                <h3 class="font-medium text-gray-800">{{ profile.name }}</h3>
                <p class="text-sm text-gray-600">{{ profile.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profils adolescents uniquement -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Profils adolescents (teenProfiles)</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="profile in teenProfiles" :key="profile.id" 
               class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center" 
                   :class="getProfileColor(profile)">
                <span class="text-white font-bold">{{ profile.name.charAt(0) }}</span>
              </div>
              <div>
                <h3 class="font-medium text-gray-800">{{ profile.name }}</h3>
                <p class="text-sm text-gray-600">{{ profile.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profils non-administrateurs -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Profils non-administrateurs (nonAdminProfiles)</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="profile in nonAdminProfiles" :key="profile.id" 
               class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center" 
                   :class="getProfileColor(profile)">
                <span class="text-white font-bold">{{ profile.name.charAt(0) }}</span>
              </div>
              <div>
                <h3 class="font-medium text-gray-800">{{ profile.name }}</h3>
                <p class="text-sm text-gray-600">{{ profile.description }}</p>
                <div class="flex space-x-2 mt-2">
                  <span v-if="profile.is_child" class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Child</span>
                  <span v-if="profile.is_teen" class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Teen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Actions</h2>
        <div class="flex space-x-4">
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" 
                  @click="refreshProfiles">
            Actualiser
          </button>
          <button class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" 
                  @click="goBack">
            Retour
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'ProfileTest',
  data() {
    return {
      store: null
    }
  },
  computed: {
    allProfiles() {
      return this.store?.profiles || []
    },
    childProfiles() {
      return this.store?.childProfiles || []
    },
    teenProfiles() {
      return this.store?.teenProfiles || []
    },
    nonAdminProfiles() {
      return this.store?.nonAdminProfiles || []
    }
  },
  async created() {
    this.store = useProfileStore()
    await this.store.loadProfiles()
  },
  methods: {
    async refreshProfiles() {
      await this.store.loadProfiles()
    },
    
    getProfileColor(profile) {
      const colors = {
        teal: 'bg-teal-500',
        purple: 'bg-purple-500',
        red: 'bg-red-500',
        green: 'bg-green-500',
        blue: 'bg-blue-500'
      }
      return colors[profile.color] || 'bg-gray-500'
    },
    
    goBack() {
      this.$router.push('/dashboard')
    }
  }
}
</script>
