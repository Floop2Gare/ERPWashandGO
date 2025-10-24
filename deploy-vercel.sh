#!/bin/bash

# Script de déploiement automatique pour Vercel
echo "🚀 Déploiement ERP Wash&Go sur Vercel..."

# Vérifier que Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI n'est pas installé. Installation..."
    npm install -g vercel
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Aller dans le dossier frontend
cd frontend

# Installer les dépendances frontend
echo "📦 Installation des dépendances frontend..."
npm install

# Revenir au répertoire racine
cd ..

# Déployer sur Vercel
echo "🚀 Déploiement sur Vercel..."
vercel --prod

echo "✅ Déploiement terminé!"
echo "💡 N'oubliez pas de configurer les variables d'environnement dans le dashboard Vercel:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
