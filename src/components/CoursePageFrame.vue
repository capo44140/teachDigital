<template>
  <!--
    Les pages de cours embarquent leur propre JavaScript (quiz).
    Sans allow-same-origin, elles s'exécutent dans une origine opaque :
    aucun accès au token, au localStorage ni au DOM de l'application.
    allow-forms est nécessaire : sans lui, l'événement submit n'est jamais déclenché.
  -->
  <iframe
    class="course-page-frame"
    :srcdoc="html"
    :title="title"
    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
    referrerpolicy="no-referrer"
  />
</template>

<script>
export default {
  name: 'CoursePageFrame',
  props: {
    html: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: 'Page de cours'
    }
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
