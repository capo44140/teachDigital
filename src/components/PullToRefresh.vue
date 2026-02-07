<template>
  <div
    ref="container"
    class="pull-to-refresh-container"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
  >
    <!-- Indicateur de pull -->
    <div
      class="ptr-indicator"
      :class="{
        'ptr-visible': pullDistance > 0,
        'ptr-threshold': pullDistance >= threshold,
        'ptr-refreshing': isRefreshing
      }"
      :style="indicatorStyle"
    >
      <div class="ptr-content">
        <!-- Spinner / Flèche -->
        <div class="ptr-icon" :class="{ 'ptr-spinning': isRefreshing }">
          <svg
            v-if="!isRefreshing"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="arrowStyle"
          >
            <polyline points="7 13 12 18 17 13" />
            <line x1="12" y1="2" x2="12" y2="18" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="ptr-spin-icon"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <span class="ptr-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- Contenu de la page -->
    <div
      class="ptr-body"
      :style="bodyStyle"
    >
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'PullToRefresh',
  props: {
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['refresh'],
  data () {
    return {
      startY: 0,
      pullDistance: 0,
      threshold: 70,
      maxPull: 120,
      isRefreshing: false,
      isPulling: false,
      touchId: null
    }
  },
  computed: {
    indicatorStyle () {
      const height = Math.min(this.pullDistance, this.maxPull)
      return {
        height: `${height}px`,
        opacity: Math.min(this.pullDistance / this.threshold, 1)
      }
    },
    bodyStyle () {
      if (this.isRefreshing) {
        return { transform: `translateY(${this.threshold}px)`, transition: 'transform 0.3s ease' }
      }
      if (this.pullDistance > 0) {
        const distance = Math.min(this.pullDistance, this.maxPull)
        return { transform: `translateY(${distance}px)`, transition: 'none' }
      }
      return { transform: 'translateY(0)', transition: 'transform 0.3s ease' }
    },
    arrowStyle () {
      const rotation = this.pullDistance >= this.threshold ? 180 : (this.pullDistance / this.threshold) * 180
      return {
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.2s ease'
      }
    },
    statusText () {
      if (this.isRefreshing) return 'Actualisation...'
      if (this.pullDistance >= this.threshold) return 'Relâchez pour actualiser'
      if (this.pullDistance > 10) return 'Tirez pour actualiser'
      return ''
    }
  },
  methods: {
    isScrolledToTop () {
      // Vérifie que le scroll est tout en haut
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
      return scrollTop <= 0
    },

    onTouchStart (e) {
      if (this.disabled || this.isRefreshing) return
      if (!this.isScrolledToTop()) return

      const touch = e.touches[0]
      this.startY = touch.clientY
      this.touchId = touch.identifier
      this.isPulling = true
    },

    onTouchMove (e) {
      if (!this.isPulling || this.disabled || this.isRefreshing) return
      if (!this.isScrolledToTop()) {
        // Si on n'est plus en haut, annuler le pull
        this.resetPull()
        return
      }

      const touch = Array.from(e.touches).find(t => t.identifier === this.touchId)
      if (!touch) return

      const deltaY = touch.clientY - this.startY

      if (deltaY > 0) {
        // Appliquer une résistance (le pull devient de plus en plus dur)
        const resistance = 0.4
        this.pullDistance = deltaY * resistance
      } else {
        this.pullDistance = 0
      }
    },

    onTouchEnd () {
      if (!this.isPulling) return

      if (this.pullDistance >= this.threshold && !this.isRefreshing) {
        this.triggerRefresh()
      } else {
        this.resetPull()
      }

      this.isPulling = false
    },

    async triggerRefresh () {
      this.isRefreshing = true
      this.pullDistance = this.threshold

      try {
        // Émettre l'événement refresh
        // Le parent peut passer une promesse pour indiquer la fin du refresh
        await new Promise((resolve) => {
          this.$emit('refresh', resolve)

          // Timeout de sécurité : si le parent ne resolve pas en 10s, on arrête
          setTimeout(resolve, 10000)
        })
      } catch (error) {
        console.error('Erreur lors du refresh:', error)
      } finally {
        // Petite pause pour que l'animation soit visible
        await new Promise(resolve => setTimeout(resolve, 300))
        this.isRefreshing = false
        this.resetPull()
      }
    },

    resetPull () {
      this.pullDistance = 0
      this.startY = 0
      this.touchId = null
    }
  }
}
</script>

<style scoped>
.pull-to-refresh-container {
  position: relative;
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.ptr-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
}

.ptr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
}

.ptr-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  transition: background 0.2s ease;
}

.ptr-threshold .ptr-icon {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.5);
}

.ptr-refreshing .ptr-icon {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.5);
}

.ptr-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.ptr-threshold .ptr-text {
  color: rgba(147, 197, 253, 0.9);
}

.ptr-spin-icon {
  animation: ptr-spin 1s linear infinite;
}

@keyframes ptr-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ptr-body {
  will-change: transform;
}
</style>
