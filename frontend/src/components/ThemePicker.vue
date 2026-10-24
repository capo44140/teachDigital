<template>
  <!--
    Choix d'un thème (registre : src/themes/index.js) : boutons radio natifs habillés en cartes,
    chacune avec une miniature aux couleurs et aux polices du thème. Les flèches du clavier
    passent d'un thème à l'autre, comme pour tout groupe de boutons radio.
  -->
  <fieldset class="theme-picker">
    <legend class="sr-only">{{ legend }}</legend>
    <div class="theme-picker__grid">
      <label
        v-for="option in options"
        :key="option.key"
        class="theme-card"
        :class="{ 'theme-card--selected': option.selected }"
      >
        <input
          type="radio"
          class="sr-only"
          :name="name"
          :value="option.key"
          :checked="option.selected"
          :aria-describedby="`${name}-${option.key}-desc`"
          @change="emit('update:modelValue', option.value)"
        >
        <span class="theme-card__preview" :style="previewStyle(option.theme)" aria-hidden="true">
          <span class="theme-card__bar"><span></span><span></span></span>
          <span class="theme-card__title">{{ option.theme.name }}</span>
          <span class="theme-card__tiles"><span></span><span></span><span></span></span>
          <span class="theme-card__button"></span>
          <span class="theme-card__emoji">{{ option.theme.emoji }}</span>
        </span>
        <span class="theme-card__name">{{ option.label }}</span>
        <span :id="`${name}-${option.key}-desc`" class="theme-card__desc">{{ option.description }}</span>
        <span v-if="option.selected" class="theme-card__check" aria-hidden="true">✓</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import { APP_THEMES } from '../themes/index.js'

const props = defineProps({
  // Thème choisi (null : option « hériter », si inheritTheme est fourni)
  modelValue: {
    type: String,
    default: null
  },
  // Nom du groupe de boutons radio (unique dans la page)
  name: {
    type: String,
    required: true
  },
  // Intitulé du groupe, lu par les lecteurs d'écran
  legend: {
    type: String,
    required: true
  },
  // Thème hérité (celui de la famille) : ajoute une première option qui renvoie null
  inheritTheme: {
    type: Object,
    default: null
  },
  inheritLabel: {
    type: String,
    default: 'Comme la famille'
  },
  themes: {
    type: Array,
    default: () => APP_THEMES
  }
})

const emit = defineEmits(['update:modelValue'])

const options = computed(() => {
  const list = props.themes.map(theme => ({
    key: theme.id,
    value: theme.id,
    theme,
    label: `${theme.emoji} ${theme.name}`,
    description: theme.description,
    selected: props.modelValue === theme.id
  }))
  if (!props.inheritTheme) return list
  return [{
    key: 'inherit',
    value: null,
    theme: props.inheritTheme,
    label: props.inheritLabel,
    description: `Actuellement : ${props.inheritTheme.emoji} ${props.inheritTheme.name}`,
    selected: !props.modelValue
  }, ...list]
})

// Couleurs de la miniature (variables CSS lues par les styles ci-dessous)
function previewStyle (theme) {
  const preview = theme.preview || {}
  return {
    '--pv-bg': preview.background,
    '--pv-surface': preview.surface,
    '--pv-border': preview.border,
    '--pv-accent': preview.accent,
    '--pv-text': preview.text,
    '--pv-radius': preview.radius,
    '--pv-font': preview.font,
    '--pv-title-font': preview.titleFont,
    '--pv-title-weight': preview.titleWeight
  }
}
</script>

<style scoped>
.theme-picker {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.theme-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 1rem;
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.625rem 0.625rem 0.875rem;
  border-radius: calc(1rem * var(--td-radius-scale, 1));
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.15);
  color: var(--color-white, #fff);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.theme-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.theme-card--selected,
.theme-card--selected:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--td-focus-ring, #a78bfa);
}

.theme-card:has(input:focus-visible) {
  outline: 2px solid var(--td-focus-ring, #a78bfa);
  outline-offset: 3px;
}

/* Miniature : barre d'en-tête, titre, tuiles et bouton aux couleurs du thème */
.theme-card__preview {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  height: 7.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.625rem;
  overflow: hidden;
  border-radius: calc(0.75rem * var(--td-radius-scale, 1));
  background: var(--pv-bg);
  color: var(--pv-text);
  font-family: var(--pv-font);
}

.theme-card__bar {
  display: flex;
  gap: 0.25rem;
  height: 0.5rem;
}

.theme-card__bar span {
  width: 1.5rem;
  border-radius: 9999px;
  background: var(--pv-surface);
  border: 1px solid var(--pv-border);
}

.theme-card__title {
  overflow: hidden;
  font-family: var(--pv-title-font);
  font-size: 1.05rem;
  font-weight: var(--pv-title-weight);
  font-synthesis: none;
  line-height: 1.15;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.theme-card__tiles {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.3rem;
}

.theme-card__tiles span {
  border-radius: var(--pv-radius);
  background: var(--pv-surface);
  border: 1px solid var(--pv-border);
}

.theme-card__button {
  width: 55%;
  height: 0.75rem;
  border-radius: var(--pv-radius);
  background: var(--pv-accent);
}

.theme-card__emoji {
  position: absolute;
  right: 0.4rem;
  bottom: 0.25rem;
  font-size: 1.5rem;
  line-height: 1;
}

.theme-card__name {
  font-weight: 600;
}

.theme-card__desc {
  font-size: 0.8125rem;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.75);
  color: color-mix(in srgb, var(--color-white, #fff) 75%, transparent);
}

.theme-card__check {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  border-radius: 9999px;
  background: var(--td-focus-ring, #a78bfa);
  color: #111827;
  font-size: 0.875rem;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
</style>
