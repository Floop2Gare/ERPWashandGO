@echo off
echo 🚀 Déploiement ERP Wash&Go sur Vercel...

REM Vérifier que Vercel CLI est installé
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI n'est pas installé. Installation...
    npm install -g vercel
)

REM Vérifier que nous sommes dans le bon répertoire
if not exist "package.json" (
    echo ❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire racine du projet.
    pause
    exit /b 1
)

REM Installer les dépendances
echo 📦 Installation des dépendances...
npm install

REM Aller dans le dossier frontend
cd frontend

REM Installer les dépendances frontend
echo 📦 Installation des dépendances frontend...
npm install

REM Revenir au répertoire racine
cd ..

REM Déployer sur Vercel
echo 🚀 Déploiement sur Vercel...
vercel --prod

echo ✅ Déploiement terminé!
echo 💡 N'oubliez pas de configurer les variables d'environnement dans le dashboard Vercel:
echo    - VITE_SUPABASE_URL
echo    - VITE_SUPABASE_ANON_KEY
pause
