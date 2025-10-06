<template>
  <div id="app">
    <router-view />
    
    <!-- Popup de mise à jour globale -->
    <UpdateNotification
      :show="updateService.state.showNotification"
      :current-version="updateService.state.currentVersion"
      :new-version="updateService.state.newVersion"
      @update="updateService.forceUpdate"
      @cancel="updateService.cancelUpdate"
    />
  </div>
</template>

<script>
import { inject } from 'vue'

export default {
  name: 'App',
  setup() {
    const updateService = inject('updateService')
    
    return {
      updateService
    }
  }
}
</script>
