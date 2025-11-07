<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <!-- Test du système Liquid Glass centralisé -->
    <div class="container mx-auto px-6 py-8">
      <h1 class="lg-text-primary text-4xl font-bold text-center mb-8">
        🎨 Test du Système Liquid Glass Centralisé
      </h1>
      
      <!-- Test des cartes glass -->
      <div class="lg-glass-grid mb-8">
        <div class="lg-glass-card">
          <h2 class="lg-text-primary text-xl font-semibold mb-4">Carte Glass de Base</h2>
          <p class="lg-text-secondary mb-4">Cette carte utilise la classe .lg-glass-card avec effet hover.</p>
          <div class="lg-glass-badge lg-gradient-quiz">
            <span>✨</span>
            <span>Badge Glass</span>
          </div>
        </div>
        
        <div class="lg-glass-card">
          <h2 class="lg-text-primary text-xl font-semibold mb-4">Boutons Glass</h2>
          <div class="space-y-3">
            <button class="lg-glass-button lg-gradient-primary w-full">
              Bouton Primary
            </button>
            <button class="lg-glass-button lg-gradient-quiz w-full">
              Bouton Quiz
            </button>
            <button class="lg-glass-button lg-gradient-learning w-full">
              Bouton Learning
            </button>
          </div>
        </div>
        
        <div class="lg-glass-card">
          <h2 class="lg-text-primary text-xl font-semibold mb-4">Toggle Glass</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="lg-text-primary">Notifications</span>
              <div class="lg-glass-toggle" :class="{ active: toggle1 }" @click="toggle1 = !toggle1">
                <div class="lg-glass-toggle-slider"></div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="lg-text-primary">Mode sombre</span>
              <div class="lg-glass-toggle" :class="{ active: toggle2 }" @click="toggle2 = !toggle2">
                <div class="lg-glass-toggle-slider"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Test de la barre de progression -->
      <div class="lg-glass-card mb-8">
        <h2 class="lg-text-primary text-xl font-semibold mb-4">Barre de Progression Glass</h2>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="lg-text-primary">Progression générale</span>
              <span class="lg-text-secondary">{{ progress }}%</span>
            </div>
            <div class="lg-glass-progress">
              <div class="lg-glass-progress-bar" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
          <button class="lg-glass-button lg-gradient-primary" @click="updateProgress">
            Mettre à jour
          </button>
        </div>
      </div>
      
      <!-- Test des gradients -->
      <div class="lg-glass-card">
        <h2 class="lg-text-primary text-xl font-semibold mb-4">Gradients Disponibles</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="h-16 rounded-lg lg-gradient-primary flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Primary</span>
          </div>
          <div class="h-16 rounded-lg lg-gradient-quiz flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Quiz</span>
          </div>
          <div class="h-16 rounded-lg lg-gradient-learning flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Learning</span>
          </div>
          <div class="h-16 rounded-lg lg-gradient-profiles flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Profiles</span>
          </div>
          <div class="h-16 rounded-lg lg-gradient-activities flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Activities</span>
          </div>
          <div class="h-16 rounded-lg lg-gradient-lessons flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Lessons</span>
          </div>
          <div class="h-16 rounded-lg lg-gradient-notifications flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Notifications</span>
          </div>
          <div class="h-16 rounded-lg lg-gradient-info flex items-center justify-center">
            <span class="lg-text-primary font-semibold">Info</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const toggle1 = ref(false)
const toggle2 = ref(true)
const progress = ref(65)

const updateProgress = () => {
  progress.value = Math.floor(Math.random() * 100)
}
</script>

<style scoped>
/* Styles spécifiques si nécessaire */
</style>


