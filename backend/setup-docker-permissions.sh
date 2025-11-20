#!/bin/bash
# Script de configuration des permissions Docker sur Synology
# Ce script doit être exécuté UNE SEULE FOIS sur le Synology

echo "=========================================="
echo "Configuration des permissions Docker"
echo "=========================================="
echo ""

# Récupérer l'utilisateur actuel
CURRENT_USER=$(whoami)
echo "Utilisateur actuel: $CURRENT_USER"
echo ""

# Vérifier si l'utilisateur est déjà dans le groupe docker
if groups $CURRENT_USER | grep -q '\bdocker\b'; then
    echo "✅ Vous êtes déjà membre du groupe docker !"
    echo ""
    echo "Test de la connexion Docker..."
    if docker ps > /dev/null 2>&1; then
        echo "✅ Docker fonctionne correctement !"
        echo ""
        echo "Vous pouvez maintenant utiliser les commandes Docker sans sudo."
        exit 0
    else
        echo "⚠️  Vous êtes dans le groupe docker mais la connexion échoue."
        echo "   Déconnectez-vous et reconnectez-vous pour que les changements prennent effet :"
        echo "   exit"
        echo "   ssh synology"
        exit 1
    fi
fi

echo "ℹ️  Vous n'êtes pas encore membre du groupe docker."
echo ""
echo "Ce script va :"
echo "  1. Ajouter votre utilisateur ($CURRENT_USER) au groupe docker"
echo "  2. Vous permettre d'utiliser Docker sans sudo"
echo ""
echo "⚠️  Vous allez devoir entrer votre mot de passe sudo."
echo ""
read -p "Continuer ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
    echo "❌ Configuration annulée."
    exit 1
fi

echo ""
echo "Ajout de $CURRENT_USER au groupe docker..."

# Ajouter l'utilisateur au groupe docker
if sudo synogroup --member docker $CURRENT_USER; then
    echo ""
    echo "✅ Configuration réussie !"
    echo ""
    echo "⚠️  IMPORTANT: Pour que les changements prennent effet, vous devez :"
    echo "   1. Vous déconnecter de cette session SSH"
    echo "   2. Vous reconnecter"
    echo ""
    echo "Commandes à exécuter :"
    echo "   exit"
    echo "   ssh synology"
    echo ""
    echo "Après reconnexion, testez avec :"
    echo "   docker ps"
    echo ""
else
    echo ""
    echo "❌ Erreur lors de l'ajout au groupe docker."
    echo ""
    echo "Vérifiez que :"
    echo "  - Vous avez les droits sudo"
    echo "  - Container Manager est installé sur le Synology"
    echo ""
    exit 1
fi
