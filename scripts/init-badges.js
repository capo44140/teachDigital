#!/usr/bin/env node

/**
 * Script d'initialisation des badges par défaut
 * Version Node - utilise l'API backend
 */

// Variables requises:
// - API_URL (ex: http://localhost:3001)  [optionnel, défaut: http://localhost:3001]
// - AUTH_TOKEN (token JWT admin)         [requis]

function getConfig() {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const token = process.env.AUTH_TOKEN;
  if (!token) {
    throw new Error('AUTH_TOKEN manquant (JWT admin requis)');
  }
  return { apiUrl, token };
}

async function fetchBadges() {
  const { apiUrl, token } = getConfig();
  const resp = await fetch(`${apiUrl}/api/badges`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Erreur HTTP ${resp.status}: ${text.substring(0, 200)}`);
  }
  const json = await resp.json();
  return json.data || [];
}

async function createBadge(badge) {
  const { apiUrl, token } = getConfig();
  const resp = await fetch(`${apiUrl}/api/badges`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(badge)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Erreur HTTP ${resp.status}: ${text.substring(0, 200)}`);
  }
  const json = await resp.json();
  return json.data || null;
}

// Badges par défaut à créer
const defaultBadges = [
  // Badges Débutant
  {
    name: "Premier Pas",
    description: "Complète ton premier quiz",
    icon: "👶",
    category: "débutant",
    condition_type: "quiz_completed",
    condition_value: 1,
    points: 10,
    color: "#10B981",
    is_active: true
  },
  {
    name: "Explorateur",
    description: "Complète 5 quiz",
    icon: "🗺️",
    category: "débutant",
    condition_type: "quiz_completed",
    condition_value: 5,
    points: 25,
    color: "#3B82F6",
    is_active: true
  },
  {
    name: "Premier Score Parfait",
    description: "Obtient 100% à un quiz",
    icon: "⭐",
    category: "débutant",
    condition_type: "perfect_score",
    condition_value: 1,
    points: 20,
    color: "#F59E0B",
    is_active: true
  },

  // Badges Progression
  {
    name: "Étudiant Assidu",
    description: "Complète 20 quiz",
    icon: "📚",
    category: "progression",
    condition_type: "quiz_completed",
    condition_value: 20,
    points: 50,
    color: "#8B5CF6",
    is_active: true
  },
  {
    name: "Série de Victoires",
    description: "Obtient 5 bons scores consécutifs",
    icon: "🔥",
    category: "progression",
    condition_type: "score_streak",
    condition_value: 5,
    points: 40,
    color: "#EF4444",
    is_active: true
  },
  {
    name: "Marathonien",
    description: "Passe 2 heures à apprendre",
    icon: "⏰",
    category: "progression",
    condition_type: "learning_time",
    condition_value: 120,
    points: 60,
    color: "#06B6D4",
    is_active: true
  },

  // Badges Excellence
  {
    name: "Maître des Quiz",
    description: "Complète 50 quiz",
    icon: "🏆",
    category: "excellence",
    condition_type: "quiz_completed",
    condition_value: 50,
    points: 100,
    color: "#F59E0B",
    is_active: true
  },
  {
    name: "Perfectionniste",
    description: "Obtient 10 scores parfaits",
    icon: "💎",
    category: "excellence",
    condition_type: "perfect_score",
    condition_value: 10,
    points: 80,
    color: "#EC4899",
    is_active: true
  },
  {
    name: "Série Légendaire",
    description: "Obtient 10 bons scores consécutifs",
    icon: "👑",
    category: "excellence",
    condition_type: "score_streak",
    condition_value: 10,
    points: 120,
    color: "#8B5CF6",
    is_active: true
  },

  // Badges Temps
  {
    name: "Première Semaine",
    description: "Apprend pendant 7 jours consécutifs",
    icon: "📅",
    category: "temps",
    condition_type: "daily_streak",
    condition_value: 7,
    points: 30,
    color: "#10B981",
    is_active: true
  },
  {
    name: "Mois d'Apprentissage",
    description: "Apprend pendant 30 jours consécutifs",
    icon: "🗓️",
    category: "temps",
    condition_type: "daily_streak",
    condition_value: 30,
    points: 150,
    color: "#3B82F6",
    is_active: true
  },
  {
    name: "Marathon Temporel",
    description: "Passe 10 heures à apprendre",
    icon: "⏳",
    category: "temps",
    condition_type: "learning_time",
    condition_value: 600,
    points: 80,
    color: "#F59E0B",
    is_active: true
  },

  // Badges Diversité
  {
    name: "Explorateur de Matières",
    description: "Étudie 5 matières différentes",
    icon: "🌈",
    category: "diversité",
    condition_type: "subjects_variety",
    condition_value: 5,
    points: 40,
    color: "#EC4899",
    is_active: true
  },
  {
    name: "Polyvalent",
    description: "Étudie 10 matières différentes",
    icon: "🎭",
    category: "diversité",
    condition_type: "subjects_variety",
    condition_value: 10,
    points: 70,
    color: "#06B6D4",
    is_active: true
  },

  // Badges Matières
  {
    name: "Mathématicien",
    description: "Complète 10 quiz de mathématiques",
    icon: "🔢",
    category: "matière",
    condition_type: "subject_specific",
    condition_value: 10,
    points: 50,
    color: "#EF4444",
    is_active: true
  },
  {
    name: "Scientifique",
    description: "Complète 10 quiz de sciences",
    icon: "🔬",
    category: "matière",
    condition_type: "subject_specific",
    condition_value: 10,
    points: 50,
    color: "#10B981",
    is_active: true
  },
  {
    name: "Historien",
    description: "Complète 10 quiz d'histoire",
    icon: "🏛️",
    category: "matière",
    condition_type: "subject_specific",
    condition_value: 10,
    points: 50,
    color: "#8B5CF6",
    is_active: true
  },
  {
    name: "Géographe",
    description: "Complète 10 quiz de géographie",
    icon: "🌍",
    category: "matière",
    condition_type: "subject_specific",
    condition_value: 10,
    points: 50,
    color: "#3B82F6",
    is_active: true
  }
];

async function initializeBadges() {
  try {
    console.log('🚀 Initialisation des badges par défaut via l\'API...');
    const { apiUrl } = getConfig();
    console.log(`📍 API_URL: ${apiUrl}`);

    // Vérifier si des badges existent déjà
    const existingBadges = await fetchBadges();
    
    if (existingBadges.length > 0) {
      console.log(`⚠️  ${existingBadges.length} badges existent déjà en base de données.`);
      console.log('Les badges existants seront ignorés, seuls les nouveaux seront créés.');
    }

    // Créer les badges
    let createdCount = 0;
    let skippedCount = 0;

    for (const badge of defaultBadges) {
      try {
        // Vérifier si le badge existe déjà (par nom)
        const existing = existingBadges.find(b => b.name === badge.name);

        if (existing) {
          console.log(`⏭️  Badge "${badge.name}" existe déjà, ignoré.`);
          skippedCount++;
          continue;
        }

        // Créer le badge via l'API
        await createBadge(badge);
        console.log(`✅ Badge créé: "${badge.name}" (${badge.icon})`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Erreur lors de la création du badge "${badge.name}":`, error.message);
      }
    }

    console.log('\n📊 Résumé de l\'initialisation:');
    console.log(`✅ Badges créés: ${createdCount}`);
    console.log(`⏭️  Badges ignorés: ${skippedCount}`);
    console.log(`📝 Total badges par défaut: ${defaultBadges.length}`);

    // Afficher les statistiques finales
    const finalBadges = await fetchBadges();
    console.log(`🎯 Total badges en base: ${finalBadges.length}`);

    console.log('\n🎉 Initialisation terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des badges:', error);
    process.exit(1);
  }
}

// Exécuter le script
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeBadges()
    .then(() => {
      console.log('✨ Script terminé.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

export { initializeBadges, defaultBadges };
