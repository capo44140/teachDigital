<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    </div>

    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
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
            <h1 class="text-2xl font-bold text-white">Pages de cours</h1>
            <p class="text-sm text-white/60 hidden sm:block">Publiez vos fiches de révision HTML pour vos enfants</p>
          </div>
        </div>
      </nav>
    </header>

    <main class="relative z-10 container mx-auto px-6 py-12 space-y-8">
      <!-- 1. Enfant destinataire -->
      <section class="glass-card-dashboard">
        <h2 class="text-xl font-bold text-white mb-4">Pour qui ?</h2>
        <p v-if="isLoadingChildren" class="text-white/60">Chargement des profils...</p>
        <p v-else-if="children.length === 0" class="text-white/60">
          Aucun profil enfant. Créez-en un dans « Gérer les profils ».
        </p>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            v-for="child in children"
            :key="child.id"
            type="button"
            :aria-pressed="child.id === selectedChildId"
            :class="[
              'p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-2',
              child.id === selectedChildId
                ? 'border-purple-400 bg-white/20'
                : 'border-white/20 hover:border-white/40 hover:bg-white/10'
            ]"
            @click="selectChild(child)"
          >
            <div class="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
              <img
                v-if="child.image_data || child.image_url"
                :src="child.image_data || child.image_url"
                alt=""
                class="w-full h-full object-cover"
                referrerpolicy="no-referrer"
              >
              <span v-else class="text-white font-bold text-lg">{{ child.name.charAt(0).toUpperCase() }}</span>
            </div>
            <p class="font-medium text-white text-sm text-center truncate w-full">{{ child.name }}</p>
          </button>
        </div>
      </section>

      <template v-if="selectedChild">
        <!-- 2. Dépôt des fichiers -->
        <section class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-4">Ajouter des pages pour {{ selectedChild.name }}</h2>
          <label
            :class="[
              'flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center',
              isDragging ? 'border-purple-400 bg-white/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
            ]"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <input type="file" accept=".html,.htm,text/html" multiple class="sr-only" @change="onFileInput">
            <svg class="w-10 h-10 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <span class="text-white font-semibold">Glissez vos fichiers .html ici, ou cliquez pour les choisir</span>
            <span class="text-white/50 text-sm">Vos pages de cours avec leurs quiz intégrés, 5 Mo maximum par page</span>
          </label>

          <ul v-if="drafts.length" class="mt-6 space-y-3">
            <li v-for="draft in drafts" :key="draft.key" class="bg-white/10 border border-white/20 rounded-xl p-4">
              <div class="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
                <label class="block">
                  <span class="block text-white/60 text-xs mb-1">Titre</span>
                  <input v-model="draft.title" class="field-input" maxlength="255" required>
                </label>
                <label class="block">
                  <span class="block text-white/60 text-xs mb-1">Matière</span>
                  <input v-model="draft.subject" class="field-input" list="course-subjects" maxlength="100" placeholder="ex. SVT">
                </label>
                <div class="flex gap-2">
                  <button type="button" class="action-button" @click="openPreview(draft.title, draft.html)">Aperçu</button>
                  <button type="button" class="action-button" :aria-label="`Retirer ${draft.fileName}`" @click="removeDraft(draft)">Retirer</button>
                </div>
              </div>
              <p class="text-white/50 text-xs mt-2">{{ draft.fileName }} · {{ formatSize(draft.size) }}</p>
              <label v-if="findExisting(draft)" class="flex items-center gap-2 mt-2 text-amber-200 text-sm">
                <input v-model="draft.replaceExisting" type="checkbox">
                Remplacer la page « {{ findExisting(draft).title }} » déjà publiée
              </label>
            </li>
          </ul>
          <datalist id="course-subjects">
            <option v-for="subject in subjects" :key="subject" :value="subject" />
          </datalist>

          <div v-if="drafts.length" class="mt-6 flex flex-wrap gap-3 justify-end">
            <button type="button" class="action-button" :disabled="isPublishing" @click="drafts = []">Annuler</button>
            <button
              type="button"
              class="action-button action-button-primary"
              :disabled="isPublishing || !canPublish"
              @click="publishDrafts"
            >
              {{ isPublishing ? 'Publication...' : publishLabel }}
            </button>
          </div>
        </section>

        <!-- 3. Pages déjà publiées -->
        <section class="glass-card-dashboard">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Pages de {{ selectedChild.name }}</h2>
            <span class="text-white/60 text-sm">{{ coursePages.length }} page{{ coursePages.length > 1 ? 's' : '' }}</span>
          </div>
          <div v-if="isLoadingPages" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white/80"></div>
          </div>
          <p v-else-if="coursePages.length === 0" class="text-white/60">Aucune page publiée pour l'instant.</p>
          <ul v-else class="divide-y divide-white/10">
            <li v-for="page in coursePages" :key="page.id" class="py-4 flex flex-col lg:flex-row lg:items-center gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white truncate">{{ page.title }}</h3>
                  <span
                    :class="page.is_published ? 'bg-green-500/30 text-green-200' : 'bg-white/10 text-white/60'"
                    class="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  >
                    {{ page.is_published ? 'Visible' : 'Masquée' }}
                  </span>
                </div>
                <p class="text-white/50 text-sm">{{ page.subject || 'Sans matière' }} · {{ formatDate(page.updated_at || page.created_at) }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="action-button" @click="previewPage(page)">Aperçu</button>
                <label class="action-button cursor-pointer">
                  Remplacer
                  <input type="file" accept=".html,.htm,text/html" class="sr-only" @change="replacePageFile(page, $event)">
                </label>
                <button type="button" class="action-button" @click="togglePublished(page)">
                  {{ page.is_published ? 'Masquer' : 'Afficher' }}
                </button>
                <button type="button" class="action-button action-button-danger" @click="deletePage(page)">Supprimer</button>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </main>

    <!-- Aperçu plein écran -->
    <div
      v-if="preview"
      class="fixed inset-0 z-50 flex flex-col bg-slate-900"
      role="dialog"
      aria-modal="true"
      :aria-label="`Aperçu : ${preview.title}`"
      @keydown.esc="closePreview"
    >
      <header class="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <h2 class="text-white font-bold truncate">Aperçu : {{ preview.title }}</h2>
        <button ref="closePreviewButton" type="button" class="action-button" @click="closePreview">Fermer</button>
      </header>
      <div class="flex-1 min-h-0">
        <div v-if="!preview.html" class="h-full flex items-center justify-center">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-white/80"></div>
        </div>
        <CoursePageFrame v-else :html="preview.html" :title="preview.title" />
      </div>
    </div>

    <VersionInfo position="bottom-right" />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { apiService } from '../services/apiService.js'
import { readCoursePageFile, COURSE_SUBJECTS } from '../services/coursePageService.js'
import CoursePageFrame from './CoursePageFrame.vue'
import VersionInfo from './VersionInfo.vue'

let nextDraftKey = 1

export default {
  name: 'CoursePageManager',
  components: { CoursePageFrame, VersionInfo },
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      isLoadingChildren: true,
      selectedChildId: null,
      coursePages: [],
      isLoadingPages: false,
      drafts: [],
      isDragging: false,
      isPublishing: false,
      preview: null,
      subjects: COURSE_SUBJECTS
    }
  },
  computed: {
    children() {
      return this.profileStore.nonAdminProfiles || []
    },
    selectedChild() {
      return this.children.find(child => child.id === this.selectedChildId) || null
    },
    canPublish() {
      return this.drafts.every(draft => draft.title.trim())
    },
    publishLabel() {
      const count = this.drafts.length
      return `Publier ${count} page${count > 1 ? 's' : ''} pour ${this.selectedChild?.name}`
    }
  },
  async created() {
    try {
      await this.profileStore.loadProfiles()
    } finally {
      this.isLoadingChildren = false
    }
    // Présélection : enfant passé dans l'URL, sinon l'enfant unique
    const fromQuery = this.children.find(child => String(child.id) === String(this.$route.query.childId))
    const initialChild = fromQuery || (this.children.length === 1 ? this.children[0] : null)
    if (initialChild) {
      await this.selectChild(initialChild)
    }
  },
  methods: {
    goBack() {
      this.$router.push({ path: '/dashboard', query: { profile: this.$route.query.profile } })
    },

    async selectChild(child) {
      if (child.id === this.selectedChildId) return
      this.selectedChildId = child.id
      this.coursePages = []
      await this.loadCoursePages()
    },

    async loadCoursePages() {
      const childId = this.selectedChildId
      this.isLoadingPages = true
      try {
        const coursePages = await apiService.getCoursePages({ targetProfileId: childId })
        // Ignorer une réponse arrivée après un changement d'enfant
        if (childId === this.selectedChildId) {
          this.coursePages = coursePages
        }
      } catch (error) {
        console.error('Erreur lors du chargement des pages de cours:', error)
        this.$toast?.error('Impossible de charger les pages de cours')
      } finally {
        this.isLoadingPages = false
      }
    },

    onFileInput(event) {
      this.addFiles(event.target.files)
      event.target.value = ''
    },

    onDrop(event) {
      this.isDragging = false
      this.addFiles(event.dataTransfer?.files)
    },

    async addFiles(fileList) {
      for (const file of Array.from(fileList || [])) {
        try {
          const page = await readCoursePageFile(file)
          this.drafts.push({ key: nextDraftKey++, ...page, replaceExisting: true })
        } catch (error) {
          this.$toast?.error(error.message)
        }
      }
    },

    removeDraft(draft) {
      this.drafts = this.drafts.filter(item => item !== draft)
    },

    // Page déjà publiée pour cet enfant avec le même titre (nouvelle version d'une fiche)
    findExisting(draft) {
      const title = draft.title.trim().toLowerCase()
      return this.coursePages.find(page => page.title.trim().toLowerCase() === title) || null
    },

    async publishDrafts() {
      if (!this.selectedChild || this.isPublishing) return
      this.isPublishing = true
      const childName = this.selectedChild.name
      const failed = []

      for (const draft of this.drafts) {
        const payload = {
          title: draft.title.trim(),
          subject: draft.subject.trim(),
          description: draft.description,
          htmlContent: draft.html
        }
        const existing = draft.replaceExisting ? this.findExisting(draft) : null
        try {
          if (existing) {
            await apiService.updateCoursePage(existing.id, { ...payload, isPublished: true })
          } else {
            await apiService.createCoursePage({ ...payload, targetProfileId: this.selectedChildId })
          }
        } catch (error) {
          console.error(`Erreur lors de la publication de « ${draft.title} »:`, error)
          failed.push(draft)
        }
      }

      const publishedCount = this.drafts.length - failed.length
      this.drafts = failed
      this.isPublishing = false
      await this.loadCoursePages()

      if (publishedCount > 0) {
        this.$toast?.success(`${publishedCount} page${publishedCount > 1 ? 's' : ''} publiée${publishedCount > 1 ? 's' : ''} pour ${childName}`)
      }
      if (failed.length > 0) {
        this.$toast?.error(`${failed.length} page${failed.length > 1 ? 's' : ''} non publiée${failed.length > 1 ? 's' : ''}, réessayez`)
      }
    },

    openPreview(title, html, id = null) {
      this.preview = { id, title, html }
      this.$nextTick(() => this.$refs.closePreviewButton?.focus())
    },

    closePreview() {
      this.preview = null
    },

    async previewPage(page) {
      this.openPreview(page.title, null, page.id)
      try {
        const coursePage = await apiService.getCoursePage(page.id)
        if (this.preview?.id === page.id) {
          this.preview.html = coursePage.html_content
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'aperçu:', error)
        this.closePreview()
        this.$toast?.error('Impossible d\'afficher l\'aperçu')
      }
    },

    async replacePageFile(page, event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      try {
        const { html, description } = await readCoursePageFile(file)
        await apiService.updateCoursePage(page.id, { htmlContent: html, description })
        this.$toast?.success(`« ${page.title} » mise à jour`)
        await this.loadCoursePages()
      } catch (error) {
        console.error('Erreur lors du remplacement de la page:', error)
        this.$toast?.error(error.message || 'Erreur lors du remplacement de la page')
      }
    },

    async togglePublished(page) {
      try {
        const updated = await apiService.updateCoursePage(page.id, { isPublished: !page.is_published })
        page.is_published = updated.is_published
        this.$toast?.success(page.is_published
          ? `« ${page.title} » est visible par ${this.selectedChild.name}`
          : `« ${page.title} » est masquée`)
      } catch (error) {
        console.error('Erreur lors du changement de visibilité:', error)
        this.$toast?.error('Impossible de modifier la visibilité')
      }
    },

    async deletePage(page) {
      if (!confirm(`Supprimer la page « ${page.title} » ? Cette action est définitive.`)) return
      try {
        await apiService.deleteCoursePage(page.id)
        this.coursePages = this.coursePages.filter(item => item.id !== page.id)
        this.$toast?.success('Page supprimée')
      } catch (error) {
        console.error('Erreur lors de la suppression de la page:', error)
        this.$toast?.error('Impossible de supprimer la page')
      }
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    },

    formatSize(bytes) {
      return bytes < 1024 * 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
        : `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    }
  }
}
</script>

<style scoped>
.field-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.field-input:focus {
  outline: none;
  border-color: rgba(192, 132, 252, 0.8);
}

.action-button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.875rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button:focus-visible,
.action-button:has(input:focus-visible) {
  outline: 2px solid rgba(192, 132, 252, 0.9);
  outline-offset: 2px;
}

.action-button-primary {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.6), rgba(236, 72, 153, 0.6));
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
  font-weight: 600;
}

.action-button-danger {
  color: rgb(254, 202, 202);
  border-color: rgba(248, 113, 113, 0.4);
}

.action-button-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
}
</style>
