<template>
  <div id="app" class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">TD</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-800">TeachDigital</h1>
          </div>
          <div class="hidden md:flex space-x-8">
            <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors">Accueil</a>
            <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors">Cours</a>
            <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors">À propos</a>
            <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
          </div>
          <button class="md:hidden">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-12">
      <!-- Hero Section -->
      <section class="text-center mb-16">
        <h2 class="text-5xl font-bold text-gray-800 mb-6">
          Apprenez le <span class="text-blue-600">numérique</span> avec nous
        </h2>
        <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Découvrez nos cours interactifs et modernes pour maîtriser les technologies du futur
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button class="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg">
            Commencer maintenant
          </button>
          <button class="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            Voir les cours
          </button>
        </div>
      </section>

      <!-- Features Section -->
      <section class="grid md:grid-cols-3 gap-8 mb-16">
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Cours Interactifs</h3>
          <p class="text-gray-600">Apprenez avec des exercices pratiques et des projets concrets</p>
        </div>

        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Apprentissage Rapide</h3>
          <p class="text-gray-600">Méthodes optimisées pour un apprentissage efficace et durable</p>
        </div>

        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Communauté</h3>
          <p class="text-gray-600">Rejoignez une communauté active d'apprenants et d'experts</p>
        </div>
      </section>

      <!-- Stats Section -->
      <section class="bg-white rounded-2xl shadow-lg p-8 mb-16">
        <div class="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div class="text-3xl font-bold text-blue-600 mb-2">1000+</div>
            <div class="text-gray-600">Étudiants actifs</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-green-600 mb-2">50+</div>
            <div class="text-gray-600">Cours disponibles</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-purple-600 mb-2">95%</div>
            <div class="text-gray-600">Taux de réussite</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-orange-600 mb-2">24/7</div>
            <div class="text-gray-600">Support disponible</div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-12">
      <div class="container mx-auto px-6">
        <div class="grid md:grid-cols-4 gap-8">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">TD</span>
              </div>
              <h3 class="text-xl font-bold">TeachDigital</h3>
            </div>
            <p class="text-gray-400">Apprenez le numérique avec des cours modernes et interactifs.</p>
          </div>
          <div>
            <h4 class="font-semibold mb-4">Navigation</h4>
            <ul class="space-y-2">
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Accueil</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Cours</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">À propos</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold mb-4">Ressources</h4>
            <ul class="space-y-2">
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold mb-4">Suivez-nous</h4>
            <div class="flex space-x-4">
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div class="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 TeachDigital. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      message: 'Bienvenue sur TeachDigital !'
    }
  }
}
</script>
