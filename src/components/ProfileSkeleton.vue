<template>
  <div class="profile-skeleton">
    <!-- Skeleton pour ProfileSelector -->
    <div v-if="type === 'selector'" class="profile-card-skeleton">
      <div class="skeleton-image"></div>
      <div class="skeleton-name"></div>
    </div>

    <!-- Skeleton pour ProfileManagement -->
    <div v-else-if="type === 'management'" class="profile-list-skeleton">
      <div class="skeleton-item" v-for="n in count" :key="n">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-subtitle"></div>
          <div class="skeleton-meta"></div>
        </div>
        <div class="skeleton-actions">
          <div class="skeleton-button"></div>
          <div class="skeleton-button"></div>
        </div>
      </div>
    </div>

    <!-- Skeleton pour Dashboard -->
    <div v-else-if="type === 'dashboard'" class="dashboard-skeleton">
      <div class="skeleton-header"></div>
      <div class="skeleton-grid">
        <div class="skeleton-card" v-for="n in 3" :key="n"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProfileSkeleton',
  props: {
    type: {
      type: String,
      default: 'selector',
      validator: (value) => ['selector', 'management', 'dashboard'].includes(value)
    },
    count: {
      type: Number,
      default: 3
    }
  }
}
</script>

<style scoped>
.profile-skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Skeleton pour ProfileSelector */
.profile-card-skeleton {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  min-width: 200px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.skeleton-image {
  width: 96px;
  height: 96px;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 auto 1rem;
}

.skeleton-name {
  height: 1.5rem;
  width: 60%;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 0.25rem;
  margin: 0 auto;
}

/* Skeleton pour ProfileManagement */
.profile-list-skeleton {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-item {
  background: rgba(31, 41, 55, 0.5);
  border-radius: 0.5rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.skeleton-avatar {
  width: 64px;
  height: 64px;
  border-radius: 0.5rem;
  background: rgba(107, 114, 128, 0.3);
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-title {
  height: 1.25rem;
  width: 40%;
  background: rgba(107, 114, 128, 0.3);
  border-radius: 0.25rem;
}

.skeleton-subtitle {
  height: 1rem;
  width: 60%;
  background: rgba(107, 114, 128, 0.2);
  border-radius: 0.25rem;
}

.skeleton-meta {
  height: 0.875rem;
  width: 30%;
  background: rgba(107, 114, 128, 0.2);
  border-radius: 0.25rem;
}

.skeleton-actions {
  display: flex;
  gap: 0.5rem;
}

.skeleton-button {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  background: rgba(107, 114, 128, 0.3);
}

/* Skeleton pour Dashboard */
.dashboard-skeleton {
  padding: 2rem;
}

.skeleton-header {
  height: 2.5rem;
  width: 300px;
  background: rgba(107, 114, 128, 0.3);
  border-radius: 0.5rem;
  margin-bottom: 2rem;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.skeleton-card {
  height: 200px;
  background: rgba(31, 41, 55, 0.5);
  border-radius: 1rem;
}

/* Animation shimmer pour un effet plus moderne */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-image,
.skeleton-name,
.skeleton-avatar,
.skeleton-title,
.skeleton-subtitle,
.skeleton-meta,
.skeleton-button,
.skeleton-header,
.skeleton-card {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
</style>

