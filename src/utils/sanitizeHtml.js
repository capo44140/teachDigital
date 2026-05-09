import DOMPurify from 'dompurify'

const AVATAR_CONFIG = {
  ALLOWED_TAGS: ['div', 'span', 'svg', 'path', 'g', 'circle', 'rect', 'polygon', 'polyline', 'line', 'ellipse', 'defs', 'linearGradient', 'radialGradient', 'stop', 'use', 'title'],
  ALLOWED_ATTR: ['class', 'style', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'viewBox', 'transform', 'points', 'offset', 'stop-color', 'stop-opacity', 'fill-opacity', 'stroke-opacity', 'opacity', 'xmlns', 'preserveAspectRatio', 'aria-hidden', 'role'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'a', 'link', 'meta', 'style', 'base'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'href', 'src', 'srcset', 'action', 'formaction', 'xlink:href'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  KEEP_CONTENT: false
}

export function sanitizeAvatarHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return ''
  return DOMPurify.sanitize(dirty, AVATAR_CONFIG)
}

export const safeHtmlDirective = {
  mounted(el, binding) {
    el.innerHTML = sanitizeAvatarHtml(binding.value)
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      el.innerHTML = sanitizeAvatarHtml(binding.value)
    }
  }
}
