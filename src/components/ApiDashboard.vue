<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div class="flex items-center">
            <h1 class="text-3xl font-bold text-gray-900">TeachDigital</h1>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-700">
              Connecté en tant que <strong>{{ user?.name }}</strong>
            </span>
            <button
              @click="handleLogout"
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Messages d'erreur -->
      <div v-if="apiStore.error" class="mb-6">
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Erreur</h3>
              <div class="mt-2 text-sm text-red-700">
                {{ apiStore.error }}
              </div>
              <div class="mt-2">
                <button
                  @click="apiStore.clearError()"
                  class="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Profils</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ profiles.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Leçons</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ lessons.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 13h6v-2H4v2zM4 7h6V5H4v2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Notifications</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ unreadCount }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Actions rapides</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            @click="refreshData"
            :disabled="loading"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {{ loading ? 'Chargement...' : 'Actualiser' }}
          </button>
          
          <button
            v-if="isAdmin"
            @click="showCreateProfile = true"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Nouveau profil
          </button>
          
          <button
            @click="showCreateLesson = true"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Nouvelle leçon
          </button>
          
          <button
            @click="markAllAsRead"
            :disabled="unreadCount === 0"
            class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Marquer tout comme lu
          </button>
        </div>
      </div>

      <!-- Liste des profils -->
      <div class="bg-white shadow rounded-lg mb-8">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Profils</h2>
        </div>
        <div class="p-6">
          <div v-if="profiles.length === 0" class="text-center text-gray-500">
            Aucun profil trouvé
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="profile in profiles"
              :key="profile.id"
              class="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 class="font-medium text-gray-900">{{ profile.name }}</h3>
              <p class="text-sm text-gray-500">{{ profile.type }}</p>
              <p class="text-sm text-gray-600 mt-2">{{ profile.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des leçons -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Leçons</h2>
        </div>
        <div class="p-6">
          <div v-if="lessons.length === 0" class="text-center text-gray-500">
            Aucune leçon trouvée
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="lesson in lessons"
              :key="lesson.id"
              class="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 class="font-medium text-gray-900">{{ lesson.title }}</h3>
              <p class="text-sm text-gray-500">{{ lesson.subject }}</p>
              <p class="text-sm text-gray-600 mt-2">{{ lesson.description }}</p>
              <div class="mt-2 flex items-center justify-between">
                <span class="text-xs text-gray-400">{{ lesson.profile_name }}</span>
                <span class="text-xs px-2 py-1 rounded-full" :class="lesson.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'">
                  {{ lesson.is_published ? 'Publié' : 'Brouillon' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApiStore } from '../stores/apiStore.js';

const router = useRouter();
const apiStore = useApiStore();

// État du composant
const loading = ref(false);
const showCreateProfile = ref(false);
const showCreateLesson = ref(false);

// Computed properties
const user = computed(() => apiStore.user);
const isAdmin = computed(() => apiStore.isAdmin);
const profiles = computed(() => apiStore.profiles);
const lessons = computed(() => apiStore.lessons);
const unreadCount = computed(() => apiStore.unreadCount);

// Initialisation
onMounted(async () => {
  if (!apiStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  
  await refreshData();
});

// Actions
const handleLogout = async () => {
  await apiStore.logout();
  router.push('/login');
};

const refreshData = async () => {
  loading.value = true;
  try {
    await apiStore.loadInitialData();
  } catch (error) {
    console.error('Erreur lors du rafraîchissement:', error);
  } finally {
    loading.value = false;
  }
};

const markAllAsRead = async () => {
  try {
    await apiStore.markAllNotificationsAsRead();
  } catch (error) {
    console.error('Erreur lors du marquage des notifications:', error);
  }
};
</script>
