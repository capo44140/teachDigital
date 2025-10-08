<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Connexion TeachDigital
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Utilisez votre profil et code PIN pour vous connecter
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <!-- Sélection du profil -->
          <div>
            <label for="profile-select" class="sr-only">Profil</label>
            <select
              id="profile-select"
              v-model="selectedProfileId"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              :disabled="loading"
              required
            >
              <option value="">Sélectionnez un profil</option>
              <option
                v-for="profile in profiles"
                :key="profile.id"
                :value="profile.id"
              >
                {{ profile.name }} ({{ profile.type }})
              </option>
            </select>
          </div>
          
          <!-- Code PIN -->
          <div>
            <label for="pin" class="sr-only">Code PIN</label>
            <input
              id="pin"
              v-model="pin"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Code PIN"
              :disabled="loading"
            />
          </div>
        </div>

        <!-- Message d'erreur -->
        <div v-if="error" class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                Erreur de connexion
              </h3>
              <div class="mt-2 text-sm text-red-700">
                {{ error }}
              </div>
            </div>
          </div>
        </div>

        <!-- Bouton de connexion -->
        <div>
          <button
            type="submit"
            :disabled="loading || !selectedProfileId || !pin"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </div>

        <!-- Informations de test -->
        <div class="mt-4 p-4 bg-blue-50 rounded-md">
          <h4 class="text-sm font-medium text-blue-800 mb-2">Mode Test</h4>
          <p class="text-xs text-blue-700">
            Pour tester, utilisez le profil "Parent" avec le code PIN "1234"
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApiStore } from '../stores/apiStore.js';

const router = useRouter();
const apiStore = useApiStore();

// État du composant
const selectedProfileId = ref('');
const pin = ref('');
const loading = ref(false);
const error = ref('');
const profiles = ref([]);

// Charger les profils au montage
onMounted(async () => {
  try {
    // Pour le test, créons des profils fictifs
    // En production, vous devriez charger depuis l'API
    profiles.value = [
      { id: 1, name: 'Parent', type: 'admin' },
      { id: 2, name: 'Ayna', type: 'teen' },
      { id: 3, name: 'Nolann', type: 'child' },
      { id: 4, name: 'Elyo', type: 'child' }
    ];
  } catch (err) {
    console.error('Erreur lors du chargement des profils:', err);
    error.value = 'Erreur lors du chargement des profils';
  }
});

// Gestion de la connexion
const handleLogin = async () => {
  if (!selectedProfileId.value || !pin.value) {
    error.value = 'Veuillez sélectionner un profil et saisir un code PIN';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await apiStore.login(parseInt(selectedProfileId.value), pin.value);
    
    // Redirection vers le dashboard
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Erreur de connexion';
  } finally {
    loading.value = false;
  }
};
</script>
