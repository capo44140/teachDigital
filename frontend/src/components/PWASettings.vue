<template>
  <div class="pwa-settings">
    <div class="settings-header">
      <h1 class="settings-title">📱 Paramètres PWA</h1>
      <p class="settings-description">
        Gérez l'installation, les mises à jour et le diagnostic de l'application Progressive Web App
      </p>
    </div>

    <div class="settings-content">
      <!-- Statut PWA -->
      <section class="settings-section">
        <h2 class="section-title">Statut PWA</h2>
        <PWAStatus />
      </section>

      <!-- Diagnostics PWA -->
      <section class="settings-section">
        <h2 class="section-title">Diagnostics</h2>
        <PWADiagnostics />
      </section>

      <!-- Prompt d'installation -->
      <section class="settings-section">
        <h2 class="section-title">Installation</h2>
        <div class="install-section">
          <InstallPrompt />
          <div class="install-info">
            <p>
              L'application peut être installée sur votre appareil pour un accès rapide depuis l'écran d'accueil.
            </p>
            <p class="text-sm text-gray-500 mt-2">
              Le prompt d'installation apparaîtra automatiquement lorsque les conditions sont remplies.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import PWAStatus from './PWAStatus.vue'
import PWADiagnostics from './PWADiagnostics.vue'
import InstallPrompt from './InstallPrompt.vue'

export default {
  name: 'PWASettings',
  components: {
    PWAStatus,
    PWADiagnostics,
    InstallPrompt
  }
}
</script>

<style scoped>
.pwa-settings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-header {
  margin-bottom: 2rem;
  text-align: center;
}

.settings-title {
  font-size: 2rem;
  font-weight: bold;
  color: #111827;
  margin-bottom: 0.5rem;
}

.settings-description {
  color: #6b7280;
  font-size: 1rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.install-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.install-info {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.install-info p {
  margin: 0;
  color: #374151;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .pwa-settings {
    padding: 1rem;
  }

  .settings-title {
    font-size: 1.5rem;
  }

  .settings-section {
    padding: 1rem;
  }
}
</style>
