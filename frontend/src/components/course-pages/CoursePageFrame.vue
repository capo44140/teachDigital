<template>
  <!--
    Les pages de cours embarquent leur propre JavaScript (quiz). Elles sont servies par
    le backend (URL signée, CSP « sandbox » dédiée) et, ici, sans allow-same-origin :
    elles s'exécutent dans une origine opaque, sans accès au token, au localStorage
    ni au DOM de l'application. Pas de popups : une page ne peut pas ouvrir un site
    extérieur devant l'enfant.
    allow-forms est nécessaire : sans lui, l'événement submit n'est jamais déclenché.
    La page ne communique avec l'application que par postMessage (score du quiz).
  -->
  <iframe
    ref="frame"
    class="course-page-frame"
    :src="src"
    :title="title"
    sandbox="allow-scripts allow-forms allow-modals"
    referrerpolicy="no-referrer"
  />
</template>

<script>
import { parseProgressMessage } from '../../services/coursePageService.js'

export default {
  name: 'CoursePageFrame',
  props: {
    // URL d'affichage isolé (getCoursePageViewUrl / getCoursePagePreviewUrl)
    src: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: 'Page de cours'
    }
  },
  emits: ['progress'],
  mounted() {
    this.onMessage = (event) => {
      // Seuls les messages de notre iframe sont pris en compte (origine opaque : pas d'origin à comparer)
      if (event.source !== this.$refs.frame?.contentWindow) return
      const progress = parseProgressMessage(event.data)
      if (progress) this.$emit('progress', progress)
    }
    window.addEventListener('message', this.onMessage)
  },
  beforeUnmount() {
    window.removeEventListener('message', this.onMessage)
  }
}
</script>

<style scoped>
.course-page-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
