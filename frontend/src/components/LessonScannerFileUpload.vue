<template>
  <div
    :class="[
      'border-2 border-dashed rounded-2xl p-8 text-center transition-all',
      isDragOver ? 'border-purple-400 bg-purple-500/10' : 'border-white/20'
    ]"
    @drop="onDrop"
    @dragover.prevent="isDragOver = true"
    @dragenter.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*,.pdf"
      multiple
      class="hidden"
      :disabled="disabled"
      @change="onFileSelect"
    />

    <div v-if="modelValue.length === 0" class="space-y-4">
      <svg class="w-16 h-16 text-white/40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
      </svg>
      <div>
        <p class="text-lg font-medium text-white">Glissez-déposez vos documents ici</p>
        <p class="text-white/60 text-sm mt-1">ou</p>
        <button
          class="mt-3 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          :disabled="disabled"
          @click="$refs.fileInput.click()"
        >
          Parcourir les fichiers
        </button>
      </div>
      <p class="text-xs text-white/50">Formats supportés: JPG, PNG, PDF (plusieurs fichiers autorisés)</p>
    </div>

    <!-- Liste des fichiers sélectionnés -->
    <div v-else class="space-y-4 text-left">
      <h3 class="text-lg font-bold text-white">
        Documents sélectionnés ({{ modelValue.length }})
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="(file, index) in modelValue"
          :key="index"
          class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all"
        >
          <button
            class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center"
            @click="$emit('remove-file', index)"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <img
                v-if="filePreviews[index]"
                :src="filePreviews[index]"
                alt="Aperçu"
                class="w-16 h-16 object-cover rounded-lg"
              />
              <div v-else class="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ file.name }}</p>
              <p class="text-xs text-white/60">{{ formatFileSize(file.size) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LessonScannerFileUpload',
  props: {
    modelValue: {
      type: Array,
      required: true
    },
    filePreviews: {
      type: Array,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['files-dropped', 'files-selected', 'remove-file'],
  data() {
    return {
      isDragOver: false
    }
  },
  methods: {
    onDrop(e) {
      e.preventDefault()
      this.isDragOver = false
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        this.$emit('files-dropped', files)
      }
    },
    onFileSelect(e) {
      const files = Array.from(e.target.files)
      if (files.length > 0) {
        this.$emit('files-selected', files)
      }
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
  }
}
</script>
