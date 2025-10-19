<template>
  <div 
    :class="['badge-card', { unlocked: badge.is_unlocked, locked: !badge.is_unlocked }]"
    @click="$emit('click', badge)"
  >
    <div class="badge-icon-container">
      <div :class="['badge-icon', colorClass]">
        {{ badge.icon }}
      </div>
      <div v-if="badge.is_unlocked" class="badge-check">✅</div>
    </div>
    
    <div class="badge-content">
      <h4 class="badge-name">{{ badge.name }}</h4>
      <p class="badge-description">{{ badge.description }}</p>
      
      <!-- Barre de progression pour les badges non débloqués -->
      <div v-if="!badge.is_unlocked" class="badge-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :class="colorClass"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
        <span class="progress-text">{{ progressPercentage }}%</span>
      </div>
      
      <!-- Points pour les badges débloqués -->
      <div v-else class="badge-points">
        <span class="points-icon">⭐</span>
        <span class="points-value">{{ badge.points }} pts</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BadgeCard',
  props: {
    badge: {
      type: Object,
      required: true
    }
  },
  computed: {
    progressPercentage() {
      if (this.badge.is_unlocked) return 100
      return Math.min(100, this.badge.progress || 0)
    },
    colorClass() {
      const colorMap = {
        'blue': 'color-blue',
        'green': 'color-green',
        'purple': 'color-purple',
        'yellow': 'color-yellow',
        'orange': 'color-orange',
        'pink': 'color-pink',
        'rainbow': 'color-rainbow'
      }
      return colorMap[this.badge.color] || 'color-purple'
    }
  }
}
</script>

<style scoped>
.badge-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #e5e7eb;
  position: relative;
  overflow: hidden;
}

.badge-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.badge-card.unlocked {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.badge-card.locked {
  opacity: 0.8;
}

.badge-card.locked .badge-icon {
  filter: grayscale(100%);
  opacity: 0.5;
}

.badge-icon-container {
  position: relative;
  margin-bottom: 1rem;
}

.badge-icon {
  font-size: 3rem;
  text-align: center;
  padding: 1rem;
  border-radius: 1rem;
  background-color: #f3f4f6;
}

.badge-card.unlocked .badge-icon {
  filter: none;
  opacity: 1;
}

.color-blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.color-green {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.color-purple {
  background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
}

.color-yellow {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.color-orange {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
}

.color-pink {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
}

.color-rainbow {
  background: linear-gradient(135deg, #fde68a 0%, #fdba74 25%, #f87171 50%, #c084fc 75%, #60a5fa 100%);
}

.badge-check {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  font-size: 1.5rem;
  background: white;
  border-radius: 50%;
  padding: 0.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.badge-content {
  text-align: center;
}

.badge-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.badge-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
  line-height: 1.4;
}

/* Progression */
.badge-progress {
  margin-top: 1rem;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background-color: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-fill.color-blue {
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
}

.progress-fill.color-green {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.progress-fill.color-purple {
  background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%);
}

.progress-fill.color-yellow {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.progress-fill.color-orange {
  background: linear-gradient(90deg, #f97316 0%, #ea580c 100%);
}

.progress-fill.color-pink {
  background: linear-gradient(90deg, #ec4899 0%, #db2777 100%);
}

.progress-fill.color-rainbow {
  background: linear-gradient(90deg, #f59e0b 0%, #f97316 25%, #ef4444 50%, #a855f7 75%, #3b82f6 100%);
}

.progress-text {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

/* Points */
.badge-points {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem;
  background-color: #fef3c7;
  border-radius: 0.5rem;
}

.points-icon {
  font-size: 1.25rem;
}

.points-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
}

/* Animation au survol */
.badge-card:hover .badge-icon {
  transform: scale(1.1) rotate(5deg);
  transition: transform 0.3s ease;
}

/* Responsive */
@media (max-width: 640px) {
  .badge-card {
    padding: 1rem;
  }
  
  .badge-icon {
    font-size: 2.5rem;
    padding: 0.75rem;
  }
  
  .badge-name {
    font-size: 1rem;
  }
  
  .badge-description {
    font-size: 0.8125rem;
  }
}
</style>

