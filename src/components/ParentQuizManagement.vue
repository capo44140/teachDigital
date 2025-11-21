<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Gestion des Interrogations</h1>
              <p class="text-sm text-white/60 hidden sm:block">Suivez les progrès de vos enfants</p>
            </div>
          </div>
          <button 
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            :disabled="isLoading"
            title="Actualiser les données"
            @click="refreshData"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- Statistiques globales -->
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Total des leçons</p>
            <p class="text-3xl font-bold text-white">{{ globalStats.totalLessons || 0 }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Quiz complétés</p>
            <p class="text-3xl font-bold text-white">{{ globalStats.totalQuizzes || 0 }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Score moyen</p>
            <p class="text-3xl font-bold text-white">{{ formatPercentage(globalStats.averageScore) }}%</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Enfants actifs</p>
            <p class="text-3xl font-bold text-white">{{ childrenStats.length }}</p>
          </div>
        </div>
      </div>

      <!-- Sélection de l'enfant -->
      <div class="glass-card-dashboard mb-12">
        <h2 class="text-xl font-bold text-white mb-4">Sélectionner un enfant</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            v-for="child in childrenStats"
            :key="child.id"
            :class="[
              'p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-2',
              selectedChild?.id === child.id 
                ? 'border-purple-400 bg-white/20' 
                : 'border-white/20 hover:border-white/40 hover:bg-white/10'
            ]"
            @click="selectChild(child)"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="child.bgColor">
              <span class="text-white font-bold text-lg">{{ child.initial }}</span>
            </div>
            <p class="font-medium text-white text-sm text-center truncate">{{ child.name }}</p>
            <p class="text-white/60 text-xs">{{ child.totalQuizzes || 0 }} quiz</p>
          </button>
        </div>
      </div>

      <!-- Détails de l'enfant sélectionné -->
      <div v-if="selectedChild" class="space-y-8">
        <!-- Statistiques de l'enfant -->
        <div class="glass-card-dashboard">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-white">
              Progrès de {{ selectedChild.name }}
            </h3>
            <span class="text-white/60 text-sm">Score moyen: <span class="text-white font-bold">{{ formatPercentage(selectedChild.averageScore) }}%</span></span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ selectedChild.totalLessons || 0 }}</p>
              <p class="text-white/60 text-sm mt-1">Leçons créées</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ selectedChild.totalQuizzes || 0 }}</p>
              <p class="text-white/60 text-sm mt-1">Quiz complétés</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ formatPercentage(selectedChild.averageScore) }}%</p>
              <p class="text-white/60 text-sm mt-1">Score moyen</p>
            </div>
          </div>
        </div>

        <!-- Résumé des quiz complétés -->
        <div v-if="selectedChild.quizHistory && selectedChild.quizHistory.length > 0" class="glass-card-dashboard">
          <h3 class="text-xl font-bold text-white mb-6">Résumé des quiz complétés</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/60 mb-1">Quiz complétés</p>
                  <p class="text-2xl font-bold text-white">{{ selectedChild.quizHistory.length }}</p>
                </div>
                <div class="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/60 mb-1">Score moyen</p>
                  <p class="text-2xl font-bold text-white">{{ formatPercentage(selectedChild.averageScore) }}%</p>
                </div>
                <div class="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/60 mb-1">Dernier quiz</p>
                  <p class="text-sm font-bold text-white">{{ selectedChild.quizHistory[0] ? formatDate(selectedChild.quizHistory[0].completedAt) : 'Aucun' }}</p>
                </div>
                <div class="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Liste des leçons -->
        <div class="glass-card-dashboard">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 class="text-xl font-bold text-white mb-3 sm:mb-0">Leçons de {{ selectedChild.name }}</h3>
            <select 
              v-model="filterStatus" 
              class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all w-full sm:w-auto"
            >
              <option value="all" class="bg-slate-900">Toutes les leçons</option>
              <option value="completed" class="bg-slate-900">Quiz complétés</option>
              <option value="pending" class="bg-slate-900">Quiz en attente</option>
            </select>
          </div>

          <div v-if="filteredLessons.length === 0" class="text-center py-12">
            <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <p class="text-white/60">Aucune leçon trouvée</p>
            <p class="text-white/40 text-sm mt-1">Créez des leçons avec le scanner</p>
          </div>
          
          <div v-else class="space-y-4">
            <div 
              v-for="lesson in filteredLessons" 
              :key="lesson.id"
              class="border border-white/20 rounded-xl p-4 hover:bg-white/10 transition-all"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                    <h4 class="font-bold text-white truncate">{{ lesson.title }}</h4>
                    <span 
                      :class="[
                        'px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 w-fit mt-1 sm:mt-0',
                        lesson.quizCompleted 
                          ? 'bg-green-500/30 text-green-200' 
                          : 'bg-yellow-500/30 text-yellow-200'
                      ]"
                    >
                      <svg v-if="lesson.quizCompleted" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                      </svg>
                      <span>{{ lesson.quizCompleted ? 'Complété' : 'En attente' }}</span>
                    </span>
                  </div>
                  <p class="text-white/60 text-sm mb-2 line-clamp-2">{{ lesson.description || 'Aucune description' }}</p>
                </div>
                
                <div v-if="lesson.quizCompleted" class="flex-shrink-0 ml-3 sm:hidden">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center" 
                       :class="lesson.bestScore >= 80 ? 'bg-green-500/30' : lesson.bestScore >= 60 ? 'bg-yellow-500/30' : 'bg-red-500/30'">
                    <span class="text-sm font-bold" 
                          :class="lesson.bestScore >= 80 ? 'text-green-200' : lesson.bestScore >= 60 ? 'text-yellow-200' : 'text-red-200'">
                      {{ formatPercentage(lesson.bestScore) }}%
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs text-white/50 mb-3">
                <span class="bg-white/10 px-2 py-1 rounded">{{ lesson.subject || 'Matière' }}</span>
                <span class="bg-white/10 px-2 py-1 rounded">{{ lesson.level || 'Niveau' }}</span>
                <span class="bg-white/10 px-2 py-1 rounded">{{ formatDate(lesson.created_at) }}</span>
              </div>

              <div class="hidden sm:flex items-center justify-between">
                <div v-if="lesson.quizCompleted" class="flex items-center space-x-3">
                  <div class="w-12 h-12 rounded-full flex items-center justify-center" 
                       :class="lesson.bestScore >= 80 ? 'bg-green-500/30' : lesson.bestScore >= 60 ? 'bg-yellow-500/30' : 'bg-red-500/30'">
                    <span class="text-lg font-bold" 
                          :class="lesson.bestScore >= 80 ? 'text-green-200' : lesson.bestScore >= 60 ? 'text-yellow-200' : 'text-red-200'">
                      {{ formatPercentage(lesson.bestScore) }}%
                    </span>
                  </div>
                  <div>
                    <p class="text-white font-medium text-sm">Meilleur score</p>
                    <p class="text-white/60 text-xs">{{ lesson.totalAttempts }} tentative{{ lesson.totalAttempts > 1 ? 's' : '' }}</p>
                  </div>
                </div>
                
                <div class="flex space-x-2">
                  <button 
                    class="p-2 text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-lg backdrop-blur-xl hover:bg-white/10 transition-all"
                    title="Voir les détails"
                    @click="viewLesson(lesson)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                  
                  <button 
                    v-if="!lesson.quizCompleted"
                    class="p-2 text-green-400/60 hover:text-green-300 border border-green-400/20 hover:border-green-400/40 rounded-lg backdrop-blur-xl hover:bg-green-400/10 transition-all"
                    title="Commencer le quiz"
                    @click="startQuiz(lesson)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z"/>
                    </svg>
                  </button>
                  
                  <button 
                    class="p-2 text-red-400/60 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg backdrop-blur-xl hover:bg-red-400/10 transition-all"
                    title="Supprimer la leçon"
                    @click="deleteLesson(lesson)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quiz récents -->
        <div v-if="selectedChild.quizHistory && selectedChild.quizHistory.length > 0" class="glass-card-dashboard">
          <h3 class="text-xl font-bold text-white mb-6">Quiz récents de {{ selectedChild.name }}</h3>
          <div class="space-y-3">
            <div 
              v-for="quiz in selectedChild.quizHistory" 
              :key="quiz.id"
              class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/15 transition-all"
            >
              <div class="flex items-center space-x-3 min-w-0 flex-1">
                <div class="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-white truncate">{{ quiz.lessonTitle }}</p>
                  <p class="text-white/60 text-sm">{{ formatDate(quiz.completedAt) }}</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0 ml-3">
                <p class="text-lg font-bold" :class="quiz.score >= 80 ? 'text-green-400' : quiz.score >= 60 ? 'text-yellow-400' : 'text-red-400'">
                  {{ quiz.score }}%
                </p>
                <p class="text-white/60 text-xs">{{ quiz.correctAnswers }}/{{ quiz.totalQuestions }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Affichage de la version -->
    <VersionInfo position="bottom-right" />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { LessonService } from '../services/lessonService.js'
import { migrationService } from '../services/migrationService.js'
import VersionInfo from './VersionInfo.vue'
import { Icon } from '@iconify/vue'

export default {
  name: 'ParentQuizManagement',
  components: {
    VersionInfo,
    Icon
  },
  
  // Rafraîchir les données quand la route change
  async beforeRouteUpdate(to, from, next) {
    await this.loadData()
    next()
  },
  data() {
    return {
      selectedChild: null,
      childrenStats: [],
      globalStats: {
        totalLessons: 0,
        totalQuizzes: 0,
        averageScore: 0
      },
      filterStatus: 'all',
      isLoading: false
    }
  },
  computed: {
    filteredLessons() {
      if (!this.selectedChild || !this.selectedChild.lessons) return []
      
      switch (this.filterStatus) {
        case 'completed':
          return this.selectedChild.lessons.filter(lesson => lesson.quizCompleted)
        case 'pending':
          return this.selectedChild.lessons.filter(lesson => !lesson.quizCompleted)
        default:
          return this.selectedChild.lessons
      }
    }
  },
  async created() {
    await this.loadData()
  },
  
  // Rafraîchir les données quand on revient sur la page
  async activated() {
    await this.loadData()
  },
  methods: {
    // Fonction utilitaire pour formater les pourcentages
    formatPercentage(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    },
    
    // Fonction utilitaire pour formater les nombres
    formatNumber(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    },

    goBack() {
      this.$router.push('/dashboard')
    },
    
    async loadData() {
      this.isLoading = true
      try {
        const store = useProfileStore()
        await store.loadProfiles()
        
        // Charger les statistiques pour tous les enfants
        await this.loadChildrenStats()
        await this.loadGlobalStats()
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async loadChildrenStats() {
      const store = useProfileStore()
      const children = store.nonAdminProfiles || []
      
      this.childrenStats = await Promise.all(
        children.map(async (child) => {
          // Utiliser le service de migration pour récupérer les statistiques détaillées
          const detailedStats = await migrationService.getChildStats(child.id)
          
          return {
            ...child,
            ...detailedStats
          }
        })
      )
    },
    
    async loadGlobalStats() {
      try {
        // Utiliser la nouvelle méthode pour récupérer les statistiques globales
        const globalStats = await LessonService.getGlobalStats()
        this.globalStats = {
          totalLessons: globalStats.total_lessons || 0,
          totalQuizzes: globalStats.total_quizzes_completed || 0,
          averageScore: globalStats.average_score || 0
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques globales:', error)
        // Fallback sur les statistiques calculées localement
        this.globalStats = {
          totalLessons: this.childrenStats.reduce((sum, child) => sum + (child.totalLessons || 0), 0),
          totalQuizzes: this.childrenStats.reduce((sum, child) => sum + (child.totalQuizzes || 0), 0),
          averageScore: this.childrenStats.length > 0 
            ? this.childrenStats.reduce((sum, child) => sum + (child.averageScore || 0), 0) / this.childrenStats.length
            : 0
        }
      }
    },
    
    selectChild(child) {
      this.selectedChild = child
    },
    
    async refreshData() {
      this.isLoading = true
      try {
        await this.loadData()
        // Afficher une notification de succès
        this.$toast?.success('Données actualisées avec succès!')
      } catch (error) {
        console.error('Erreur lors de l\'actualisation:', error)
        this.$toast?.error('Erreur lors de l\'actualisation des données')
      } finally {
        this.isLoading = false
      }
    },
    
    viewLesson(lesson) {
      // Rediriger vers la page de détails de la leçon
      this.$router.push({
        name: 'LessonDetails',
        params: { lessonId: lesson.id },
        query: { childId: this.selectedChild.id }
      })
    },
    
    startQuiz(lesson) {
      // Rediriger vers le quiz
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.selectedChild.id,
          lessonId: lesson.id
        }
      })
    },
    
    async deleteLesson(lesson) {
      if (confirm(`Êtes-vous sûr de vouloir supprimer la leçon "${lesson.title}" ?`)) {
        try {
          await LessonService.deleteLesson(lesson.id, this.selectedChild.id)
          await this.loadData() // Recharger les données
        } catch (error) {
          console.error('Erreur lors de la suppression:', error)
          alert('Erreur lors de la suppression de la leçon')
        }
      }
    },
    
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
/* Animations */
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Glass Cards */
.glass-card-dashboard {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  width: 100%;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.glass-card-stat {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card-stat:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

/* Responsive */
@media (max-width: 640px) {
  .glass-card-dashboard {
    padding: 1rem;
    border-radius: 1rem;
  }
}
</style>
