<template>
  <div class="image-upload-container">
    <!-- Zone de drop ou bouton d'upload -->
    <div 
      :class="[
        'upload-zone',
        isDragOver ? 'drag-over' : '',
        hasImage ? 'has-image' : ''
      ]"
      @click="triggerFileInput"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <!-- Image existante -->
      <div v-if="imagePreview" class="image-preview">
        <img :src="imagePreview" :alt="altText" class="preview-image">
        <div class="image-overlay">
          <button 
            class="remove-btn"
            title="Supprimer l'image"
            @click.stop="removeImage"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <button 
            class="change-btn"
            title="Changer l'image"
            @click.stop="triggerFileInput"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Zone d'upload vide -->
      <div v-else class="upload-placeholder">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p class="text-gray-400 text-sm mt-2">Cliquez ou glissez une image</p>
        <p class="text-gray-500 text-xs">JPG, PNG, GIF, WebP (max 5MB)</p>
      </div>

      <!-- Indicateur de chargement -->
      <div v-if="isUploading" class="upload-loading">
        <div class="spinner"></div>
        <p class="text-white text-sm mt-2">Upload en cours...</p>
      </div>
    </div>

    <!-- Input file caché -->
    <input 
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Messages d'erreur -->
    <div v-if="error" class="error-message">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ProfileService } from '../services/profile/index.js'

export default {
  name: 'ImageUpload',
  props: {
    profileId: {
      type: Number,
      required: true
    },
    currentImage: {
      type: String,
      default: null
    },
    altText: {
      type: String,
      default: 'Image du profil'
    },
    size: {
      type: String,
      default: 'medium', // small, medium, large
      validator: value => ['small', 'medium', 'large'].includes(value)
    }
  },
  data() {
    return {
      imagePreview: this.currentImage,
      isDragOver: false,
      isUploading: false,
      error: null
    }
  },
  computed: {
    hasImage() {
      return !!this.imagePreview
    },
    uploadZoneClass() {
      return {
        'upload-zone': true,
        'drag-over': this.isDragOver,
        'has-image': this.hasImage,
        [`size-${this.size}`]: true
      }
    }
  },
  watch: {
    currentImage(newImage) {
      this.imagePreview = newImage
    }
  },

  mounted() {
    // Ajouter les listeners pour le drag & drop
    const uploadZone = this.$el.querySelector('.upload-zone')
    uploadZone.addEventListener('dragover', this.handleDragOver)
    uploadZone.addEventListener('dragleave', this.handleDragLeave)
  },

  beforeUnmount() {
    // Nettoyer les listeners
    const uploadZone = this.$el.querySelector('.upload-zone')
    if (uploadZone) {
      uploadZone.removeEventListener('dragover', this.handleDragOver)
      uploadZone.removeEventListener('dragleave', this.handleDragLeave)
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.processFile(file)
      }
    },

    handleDrop(event) {
      this.isDragOver = false
      const file = event.dataTransfer.files[0]
      if (file) {
        this.processFile(file)
      }
    },

    async processFile(file) {
      this.error = null
      this.isUploading = true

      try {
        // Valider le type de fichier
        if (!ProfileService.validateImageType(file)) {
          throw new Error('Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.')
        }

        // Valider la taille
        if (!ProfileService.validateImageSize(file)) {
          throw new Error('Fichier trop volumineux. Taille maximum : 5MB.')
        }

        // Convertir en base64
        const imageData = await ProfileService.fileToBase64(file)
        
        // Mettre à jour l'image du profil
        await ProfileService.updateProfileImage(this.profileId, imageData, file.type)
        
        // Mettre à jour l'aperçu
        this.imagePreview = imageData
        
        // Émettre l'événement de succès
        this.$emit('image-uploaded', {
          imageData,
          imageType: file.type,
          fileName: file.name
        })

        console.log('✅ Image uploadée avec succès')
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors de l\'upload:', error)
        this.$emit('upload-error', error)
      } finally {
        this.isUploading = false
      }
    },

    async removeImage() {
      try {
        await ProfileService.removeProfileImage(this.profileId)
        this.imagePreview = null
        
        // Émettre l'événement de suppression
        this.$emit('image-removed')
        
        console.log('✅ Image supprimée avec succès')
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors de la suppression:', error)
      }
    },

    // Gestion du drag & drop
    handleDragOver(event) {
      event.preventDefault()
      this.isDragOver = true
    },

    handleDragLeave(event) {
      event.preventDefault()
      this.isDragOver = false
    }
  }
}
</script>

<style scoped>
.image-upload-container {
  position: relative;
}

.upload-zone {
  position: relative;
  border: 2px dashed #4b5563;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-zone:hover {
  border-color: #6b7280;
  background-color: #1f2937;
}

.upload-zone.drag-over {
  border-color: #3b82f6;
  background-color: rgba(30, 58, 138, 0.2);
}

.upload-zone.has-image {
  border-style: solid;
  border-color: #6b7280;
}

.upload-zone.size-small {
  width: 4rem;
  height: 4rem;
}

.upload-zone.size-medium {
  width: 6rem;
  height: 6rem;
}

.upload-zone.size-large {
  width: 8rem;
  height: 8rem;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.image-overlay:hover {
  background-color: rgba(0, 0, 0, 0.5);
}

.remove-btn, .change-btn {
  padding: 0.5rem;
  background-color: #dc2626;
  color: white;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s;
}

.change-btn {
  background-color: #2563eb;
}

.change-btn:hover {
  background-color: #1d4ed8;
}

.image-overlay:hover .remove-btn,
.image-overlay:hover .change-btn {
  opacity: 1;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 1rem;
}

.upload-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 4px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  color: #f87171;
  font-size: 0.875rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Animation pour le drag & drop */
.upload-zone.drag-over .upload-placeholder {
  transform: scale(1.05);
}
</style>
