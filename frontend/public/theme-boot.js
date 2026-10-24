/*
 * Thème de l'application appliqué avant le premier rendu.
 *
 * Script classique et bloquant, chargé dans le <head> de index.html : il pose
 * data-app-theme sur <html> (et la couleur de la barre d'état) avant que la page ne
 * s'affiche, pour ne pas montrer un instant le thème par défaut. Il relit le dernier thème
 * appliqué, enregistré par src/stores/themeStore.js, qui prend ensuite le relais.
 * La CSP (script-src 'self') interdit les scripts inline : d'où ce fichier.
 */
(function () {
  try {
    var state = JSON.parse(window.localStorage.getItem('teachdigital_theme') || 'null')
    var id = state && state.applied
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(id)) return
    document.documentElement.setAttribute('data-app-theme', id)

    var color = state.appliedColor
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta && typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color)) {
      meta.setAttribute('content', color)
    }
  } catch (error) {
    // Stockage indisponible ou valeur illisible : thème par défaut
  }
})()
