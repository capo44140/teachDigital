<template>
  <section class="glass-card-dashboard">
    <h2 class="text-xl font-bold text-white mb-1">Générer une page avec l'IA</h2>
    <p class="text-white/70 text-sm mb-4">
      Prenez en photo la leçon ou le contrôle de {{ child.name }} : l'IA crée une fiche d'entraînement interactive
      (leçon, erreurs à corriger, pièges, exercices), que vous relisez avant de la publier.
    </p>

    <div class="grid gap-4 md:grid-cols-2">
      <label class="block">
        <span class="block text-white/70 text-xs mb-1">Matière</span>
        <input v-model="subject" class="field-input" list="course-subjects" maxlength="100" placeholder="ex. Mathématiques" :disabled="isGenerating">
      </label>
      <label class="block">
        <span class="block text-white/70 text-xs mb-1">Sujet de l'interro</span>
        <input v-model="topic" class="field-input" maxlength="255" placeholder="ex. le théorème de Pythagore" :disabled="isGenerating">
      </label>
      <label class="block md:col-span-2">
        <span class="block text-white/70 text-xs mb-1">Consignes supplémentaires (facultatif)</span>
        <textarea v-model="instructions" class="field-input" rows="2" maxlength="2000" placeholder="ex. insister sur les unités, interro jeudi" :disabled="isGenerating"></textarea>
      </label>
    </div>

    <label
      :class="[
        'mt-4 flex flex-col items-center justify-center gap-1 p-6 rounded-2xl border-2 border-dashed text-center transition-all',
        isGenerating ? 'opacity-50 cursor-not-allowed border-white/20' : 'cursor-pointer border-white/20 hover:border-white/40 hover:bg-white/5'
      ]"
    >
      <input type="file" accept="image/*" multiple class="sr-only" :disabled="isGenerating" @change="onPhotoInput">
      <span class="text-white font-semibold">Ajouter des photos de la leçon / du contrôle</span>
      <span class="text-white/70 text-sm">{{ maxPhotos }} photos maximum, lisibles et bien cadrées</span>
    </label>

    <ul v-if="photos.length" class="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
      <li v-for="photo in photos" :key="photo.key" class="relative">
        <img :src="photo.url" :alt="photo.file.name" class="w-full aspect-[3/4] object-cover rounded-xl border border-white/20">
        <button
          v-if="!isGenerating"
          type="button"
          class="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white text-sm"
          :aria-label="`Retirer ${photo.file.name}`"
          @click="removePhoto(photo)"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </li>
    </ul>

    <div class="mt-6 flex flex-wrap items-center justify-end gap-3">
      <p v-if="isGenerating" class="text-white/70 text-sm flex items-center gap-2 mr-auto" role="status">
        <span class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white/80" aria-hidden="true"></span>
        {{ progressLabel }}
      </p>
      <button
        type="button"
        class="action-button action-button-primary"
        :disabled="isGenerating || photos.length === 0"
        @click="generate"
      >
        {{ isGenerating ? 'Génération...' : 'Générer la page' }}
      </button>
    </div>
  </section>
</template>

<script>
import { AIService } from '../../services/aiService.js'
import imageOptimizationService from '../../services/imageOptimizationService.js'

// 8 photos (le serveur en accepte 10 au maximum, cf. AI_MAX_DOCUMENTS)
const MAX_PHOTOS = 8
let nextPhotoKey = 1

export default {
  name: 'CoursePageGenerator',
  props: {
    child: { type: Object, required: true }
  },
  emits: ['generated'],
  data() {
    return {
      subject: '',
      topic: '',
      instructions: '',
      photos: [],
      isGenerating: false,
      startedAt: 0,
      elapsedSeconds: 0,
      timer: null,
      maxPhotos: MAX_PHOTOS
    }
  },
  computed: {
    progressLabel() {
      const minutes = Math.floor(this.elapsedSeconds / 60)
      const seconds = String(this.elapsedSeconds % 60).padStart(2, '0')
      return `L'IA rédige la page (${minutes}:${seconds}), cela peut prendre plusieurs minutes…`
    }
  },
  beforeUnmount() {
    this.stopTimer()
    this.photos.forEach(photo => URL.revokeObjectURL(photo.url))
  },
  methods: {
    onPhotoInput(event) {
      const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'))
      event.target.value = ''
      const room = MAX_PHOTOS - this.photos.length
      if (files.length > room) {
        this.$toast?.error(`${MAX_PHOTOS} photos maximum`)
      }
      for (const file of files.slice(0, Math.max(0, room))) {
        this.photos.push({ key: nextPhotoKey++, file, url: URL.createObjectURL(file) })
      }
    },

    removePhoto(photo) {
      URL.revokeObjectURL(photo.url)
      this.photos = this.photos.filter(item => item !== photo)
    },

    // Réduit les photos du téléphone (moins d'envoi, moins de jetons) en gardant l'écriture lisible
    async preparePhoto(file) {
      try {
        const result = await imageOptimizationService.optimizeImage(file, {
          quality: 'high',
          maxWidth: 2048,
          maxHeight: 2048,
          format: 'jpeg'
        })
        if (!result?.success || !result.blob || result.blob.size >= file.size) return file
        return new File([result.blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
      } catch {
        return file
      }
    },

    startTimer() {
      this.startedAt = Date.now()
      this.elapsedSeconds = 0
      this.timer = setInterval(() => {
        this.elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000)
      }, 1000)
    },

    stopTimer() {
      clearInterval(this.timer)
      this.timer = null
    },

    async generate() {
      if (this.isGenerating || this.photos.length === 0) return
      this.isGenerating = true
      this.startTimer()
      try {
        const files = await Promise.all(this.photos.map(photo => this.preparePhoto(photo.file)))
        const result = await new AIService().generateCoursePage(files, this.child, {
          subject: this.subject.trim(),
          topic: this.topic.trim(),
          instructions: this.instructions.trim()
        })
        if (!result?.html) throw new Error('La réponse de l\'IA ne contient pas de page')

        this.$emit('generated', { ...result, subject: this.subject.trim(), topic: this.topic.trim() })
        this.photos.forEach(photo => URL.revokeObjectURL(photo.url))
        this.photos = []
        this.topic = ''
        this.instructions = ''
        this.$toast?.success('Page générée : relisez-la avec « Aperçu » avant de la publier')
      } catch (error) {
        this.$toast?.error(error.message || 'Impossible de générer la page')
      } finally {
        this.stopTimer()
        this.isGenerating = false
      }
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

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button-primary {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.6), rgba(236, 72, 153, 0.6));
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
  font-weight: 600;
}
</style>
