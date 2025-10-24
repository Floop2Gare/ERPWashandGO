@echo off
echo 🚀 DÉPLOIEMENT VERCEL AUTOMATISÉ
echo =================================

echo.
echo 🔨 Étape 1: Test automatisé du build
node test-vercel-deployment.js
if %errorlevel% neq 0 (
    echo ❌ Le test de build a échoué. Arrêt du processus.
    pause
    exit /b 1
)

echo.
echo 📤 Étape 2: Push vers le repository
git add .
git commit -m "Auto-deploy: %date% %time%"
git push origin main
if %errorlevel% neq 0 (
    echo ❌ Le push a échoué. Arrêt du processus.
    pause
    exit /b 1
)

echo.
echo 🎉 DÉPLOIEMENT RÉUSSI !
echo ✅ Build testé et validé
echo ✅ Code poussé vers le repository
echo 🚀 Vercel déploiera automatiquement depuis le repository !

echo.
echo ✨ Processus de déploiement terminé !
pause
