<template>
  <div class="version-info" :class="position">
    <div class="version-badge" :title="versionDetails" @click="toggleDetails">
      <i class="fas fa-info-circle"></i>
      <span class="version-text">v{{ appVersion }}</span>
    </div>
    
    <!-- Détails de la version (au survol ou clic) -->
    <div v-if="showDetails" class="version-details" :class="detailsPosition">
      <div class="version-details-content">
        <h4>Informations de version</h4>
        <div class="version-detail-item">
          <span class="label">Version:</span>
          <span class="value">{{ appVersion }}</span>
        </div>
        <div v-if="buildDate" class="version-detail-item">
          <span class="label">Build:</span>
          <span class="value">{{ formatDate(buildDate) }}</span>
        </div>
        <div v-if="buildNumber" class="version-detail-item">
          <span class="label">Build #:</span>
          <span class="value">{{ buildNumber }}</span>
        </div>
        <div class="version-detail-item">
          <span class="label">Environnement:</span>
          <span class="value">{{ environment }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VersionInfo',
  props: {
    position: {
      type: String,
      default: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
      validator: (value) => ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(value)
    },
    showOnHover: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      appVersion: '0.0.1',
      buildDate: null,
      buildNumber: null,
      showDetails: false,
      environment: 'production'
    }
  },
  computed: {
    versionDetails() {
      return `Version ${this.appVersion}${this.buildDate ? ` - Build ${this.formatDate(this.buildDate)}` : ''}`
    },
    detailsPosition() {
      const positions = {
        'bottom-right': 'details-top-left',
        'bottom-left': 'details-top-right', 
        'top-right': 'details-bottom-left',
        'top-left': 'details-bottom-right'
      }
      return positions[this.position] || 'details-top-left'
    }
  },
  async created() {
    await this.loadVersionInfo()
  },
  mounted() {
    if (this.showOnHover) {
      this.$el.addEventListener('mouseenter', () => {
        this.showDetails = true
      })
      this.$el.addEventListener('mouseleave', () => {
        this.showDetails = false
      })
    }
    
    // Fermer les détails en cliquant ailleurs
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    async loadVersionInfo() {
      try {
        // Charger les informations de version depuis le fichier version.json
        const response = await fetch('/version.json')
        if (response.ok) {
          const versionData = await response.json()
          this.appVersion = versionData.version || '0.0.1'
          this.buildDate = versionData.buildDate
          this.buildNumber = versionData.buildNumber
        }
      } catch (error) {
        console.warn('Impossible de charger les informations de version:', error)
        // Fallback vers package.json
        try {
          const response = await fetch('/package.json')
          if (response.ok) {
            const packageData = await response.json()
            this.appVersion = packageData.version || '0.0.1'
          }
        } catch (packageError) {
          console.warn('Impossible de charger package.json:', packageError)
        }
      }
      
      // Déterminer l'environnement
      this.environment = import.meta.env.MODE || 'production'
    },
    
    toggleDetails() {
      this.showDetails = !this.showDetails
    },
    
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        return dateString
      }
    },
    
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.showDetails = false
      }
    }
  }
}
</script>

<style scoped>
.version-info {
  position: fixed;
  z-index: 1000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.version-info.bottom-right {
  bottom: 20px;
  right: 20px;
}

.version-info.bottom-left {
  bottom: 20px;
  left: 20px;
}

.version-info.top-right {
  top: 20px;
  right: 20px;
}

.version-info.top-left {
  top: 20px;
  left: 20px;
}

.version-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.version-badge:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.version-badge i {
  font-size: 10px;
  opacity: 0.8;
}

.version-text {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.version-details {
  position: absolute;
  z-index: 1001;
  margin: 8px 0;
}

.version-details.details-top-left {
  bottom: 100%;
  right: 0;
}

.version-details.details-top-right {
  bottom: 100%;
  left: 0;
}

.version-details.details-bottom-left {
  top: 100%;
  right: 0;
}

.version-details.details-bottom-right {
  top: 100%;
  left: 0;
}

.version-details-content {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.1);
  min-width: 200px;
  backdrop-filter: blur(10px);
}

.version-details-content h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.version-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.version-detail-item:last-child {
  margin-bottom: 0;
}

.version-detail-item .label {
  color: #6c757d;
  font-weight: 500;
}

.version-detail-item .value {
  color: #2c3e50;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

/* Animation d'apparition */
.version-details {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .version-info.bottom-right,
  .version-info.bottom-left {
    bottom: 10px;
  }
  
  .version-info.top-right,
  .version-info.top-left {
    top: 10px;
  }
  
  .version-badge {
    padding: 6px 10px;
    font-size: 11px;
  }
  
  .version-details-content {
    min-width: 180px;
    padding: 12px;
  }
}
</style>
