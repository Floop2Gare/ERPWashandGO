# Script de déploiement automatisé pour Vercel
# Usage: .\deploy.ps1

Write-Host "🚀 DÉPLOIEMENT VERCEL AUTOMATISÉ" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Fonction pour exécuter une commande avec gestion d'erreur
function Invoke-CommandWithErrorHandling {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "`n📋 $Description" -ForegroundColor Yellow
    Write-Host "💻 Commande: $Command" -ForegroundColor Gray
    
    try {
        Invoke-Expression $Command
        Write-Host "✅ Succès" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Échec" -ForegroundColor Red
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour vérifier l'état Git
function Test-GitStatus {
    Write-Host "`n🔍 Vérification de l'état Git" -ForegroundColor Yellow
    
    try {
        # Vérifier si on est dans un repo Git
        git status | Out-Null
        Write-Host "✅ Repository Git détecté" -ForegroundColor Green
        
        # Vérifier s'il y a des changements non commités
        $status = git status --porcelain
        if ($status) {
            Write-Host "⚠️  Changements non commités détectés:" -ForegroundColor Yellow
            Write-Host $status -ForegroundColor Gray
            return $false
        } else {
            Write-Host "✅ Aucun changement non commité" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ Erreur Git: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour créer un commit automatique
function New-AutoCommit {
    Write-Host "`n📝 Création d'un commit automatique" -ForegroundColor Yellow
    
    try {
        # Ajouter tous les fichiers
        git add .
        Write-Host "✅ Fichiers ajoutés au staging" -ForegroundColor Green
        
        # Créer un commit avec timestamp
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $commitMessage = "Auto-deploy: $timestamp"
        
        git commit -m $commitMessage
        Write-Host "✅ Commit créé: $commitMessage" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "❌ Erreur lors du commit: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour pousser vers le repository
function Push-ToRepository {
    Write-Host "`n📤 Push vers le repository" -ForegroundColor Yellow
    
    try {
        git push origin main
        Write-Host "✅ Push réussi vers origin/main" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Erreur lors du push: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour vérifier le déploiement Vercel
function Test-VercelDeployment {
    Write-Host "`n🌐 Vérification du déploiement Vercel" -ForegroundColor Yellow
    
    try {
        # Vérifier si Vercel CLI est installé
        vercel --version | Out-Null
        Write-Host "✅ Vercel CLI détecté" -ForegroundColor Green
        
        # Déployer en mode preview
        Write-Host "🚀 Déploiement Vercel en cours..." -ForegroundColor Yellow
        $deployResult = Invoke-CommandWithErrorHandling "vercel --yes" "Déploiement Vercel preview"
        
        if ($deployResult) {
            Write-Host "✅ Déploiement Vercel réussi" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Déploiement Vercel échoué" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Vercel CLI non trouvé: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "ℹ️  Installation de Vercel CLI..." -ForegroundColor Yellow
        
        try {
            npm install -g vercel
            Write-Host "✅ Vercel CLI installé" -ForegroundColor Green
            return Test-VercelDeployment
        }
        catch {
            Write-Host "❌ Impossible d'installer Vercel CLI: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# Processus principal
Write-Host "`n🎯 Début du processus de déploiement automatisé" -ForegroundColor Cyan

# Étape 1: Vérifier l'état Git
$gitStatus = Test-GitStatus
if (-not $gitStatus) {
    Write-Host "`n⚠️  Changements détectés, création d'un commit automatique..." -ForegroundColor Yellow
    if (-not (New-AutoCommit)) {
        Write-Host "❌ Impossible de créer un commit. Arrêt du processus." -ForegroundColor Red
        exit 1
    }
}

# Étape 2: Build et test
Write-Host "`n🔨 Étape 2: Build et test" -ForegroundColor Yellow
$buildResult = Invoke-CommandWithErrorHandling "node test-vercel-deployment.js" "Test automatisé du build"

if (-not $buildResult) {
    Write-Host "❌ Le test de build a échoué. Arrêt du processus." -ForegroundColor Red
    exit 1
}

# Étape 3: Push vers le repository
Write-Host "`n📤 Étape 3: Push vers le repository" -ForegroundColor Yellow
if (-not (Push-ToRepository)) {
    Write-Host "❌ Le push a échoué. Arrêt du processus." -ForegroundColor Red
    exit 1
}

# Étape 4: Déploiement Vercel (optionnel)
Write-Host "`n🌐 Étape 4: Déploiement Vercel" -ForegroundColor Yellow
$deploySuccess = Test-VercelDeployment

# Résultat final
Write-Host "`n🎯 RÉSULTAT FINAL" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

if ($buildResult -and $deploySuccess) {
    Write-Host "🎉 DÉPLOIEMENT COMPLET RÉUSSI !" -ForegroundColor Green
    Write-Host "✅ Build testé et validé" -ForegroundColor Green
    Write-Host "✅ Code poussé vers le repository" -ForegroundColor Green
    Write-Host "✅ Déploiement Vercel réussi" -ForegroundColor Green
    Write-Host "`n🚀 Votre application est maintenant déployée !" -ForegroundColor Green
} elseif ($buildResult) {
    Write-Host "✅ BUILD RÉUSSI - CODE POUSSÉ" -ForegroundColor Green
    Write-Host "✅ Build testé et validé" -ForegroundColor Green
    Write-Host "✅ Code poussé vers le repository" -ForegroundColor Green
    Write-Host "⚠️  Déploiement Vercel non effectué (optionnel)" -ForegroundColor Yellow
    Write-Host "`n🚀 Vercel déploiera automatiquement depuis le repository !" -ForegroundColor Green
} else {
    Write-Host "❌ DÉPLOIEMENT ÉCHOUÉ" -ForegroundColor Red
    Write-Host "🔧 Vérifiez les erreurs ci-dessus" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Processus de déploiement terminé !" -ForegroundColor Cyan
