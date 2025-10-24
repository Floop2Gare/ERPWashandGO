const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 DÉPLOIEMENT VERCEL AUTOMATISÉ');
console.log('================================');

// Fonction pour exécuter une commande avec gestion d'erreur
function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`💻 Commande: ${command}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Succès');
    return { success: true, output };
  } catch (error) {
    console.log('❌ Échec');
    console.log('Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour vérifier l'état Git
function checkGitStatus() {
  console.log('\n🔍 Vérification de l\'état Git');
  
  try {
    // Vérifier si on est dans un repo Git
    execSync('git status', { stdio: 'pipe' });
    console.log('✅ Repository Git détecté');
    
    // Vérifier s'il y a des changements non commités
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('⚠️  Changements non commités détectés:');
      console.log(status);
      return false;
    } else {
      console.log('✅ Aucun changement non commité');
      return true;
    }
  } catch (error) {
    console.log('❌ Erreur Git:', error.message);
    return false;
  }
}

// Fonction pour créer un commit automatique si nécessaire
function autoCommit() {
  console.log('\n📝 Création d\'un commit automatique');
  
  try {
    // Ajouter tous les fichiers
    execSync('git add .', { stdio: 'inherit' });
    console.log('✅ Fichiers ajoutés au staging');
    
    // Créer un commit avec timestamp
    const timestamp = new Date().toISOString();
    const commitMessage = `Auto-deploy: ${timestamp}`;
    
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('✅ Commit créé:', commitMessage);
    
    return true;
  } catch (error) {
    console.log('❌ Erreur lors du commit:', error.message);
    return false;
  }
}

// Fonction pour pousser vers le repository
function pushToRepository() {
  console.log('\n📤 Push vers le repository');
  
  try {
    // Pousser vers la branche main
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Push réussi vers origin/main');
    return true;
  } catch (error) {
    console.log('❌ Erreur lors du push:', error.message);
    return false;
  }
}

// Fonction pour vérifier le déploiement Vercel
function checkVercelDeployment() {
  console.log('\n🌐 Vérification du déploiement Vercel');
  
  try {
    // Vérifier si Vercel CLI est installé
    execSync('vercel --version', { stdio: 'pipe' });
    console.log('✅ Vercel CLI détecté');
    
    // Déployer en mode preview
    console.log('🚀 Déploiement Vercel en cours...');
    const deployResult = runCommand('vercel --yes', 'Déploiement Vercel preview');
    
    if (deployResult.success) {
      console.log('✅ Déploiement Vercel réussi');
      return true;
    } else {
      console.log('❌ Déploiement Vercel échoué');
      return false;
    }
  } catch (error) {
    console.log('❌ Vercel CLI non trouvé:', error.message);
    console.log('ℹ️  Installation de Vercel CLI...');
    
    try {
      execSync('npm install -g vercel', { stdio: 'inherit' });
      console.log('✅ Vercel CLI installé');
      return checkVercelDeployment();
    } catch (installError) {
      console.log('❌ Impossible d\'installer Vercel CLI:', installError.message);
      return false;
    }
  }
}

// Fonction principale
async function main() {
  console.log('🎯 Début du processus de déploiement automatisé');
  
  // Étape 1: Vérifier l'état Git
  const gitStatus = checkGitStatus();
  if (!gitStatus) {
    console.log('\n⚠️  Changements détectés, création d\'un commit automatique...');
    if (!autoCommit()) {
      console.log('❌ Impossible de créer un commit. Arrêt du processus.');
      process.exit(1);
    }
  }
  
  // Étape 2: Build et test
  console.log('\n🔨 Étape 2: Build et test');
  const buildResult = runCommand('node test-vercel-deployment.js', 'Test automatisé du build');
  
  if (!buildResult.success) {
    console.log('❌ Le test de build a échoué. Arrêt du processus.');
    process.exit(1);
  }
  
  // Étape 3: Push vers le repository
  console.log('\n📤 Étape 3: Push vers le repository');
  if (!pushToRepository()) {
    console.log('❌ Le push a échoué. Arrêt du processus.');
    process.exit(1);
  }
  
  // Étape 4: Déploiement Vercel (optionnel)
  console.log('\n🌐 Étape 4: Déploiement Vercel');
  const deploySuccess = checkVercelDeployment();
  
  // Résultat final
  console.log('\n🎯 RÉSULTAT FINAL');
  console.log('================');
  
  if (buildResult.success && deploySuccess) {
    console.log('🎉 DÉPLOIEMENT COMPLET RÉUSSI !');
    console.log('✅ Build testé et validé');
    console.log('✅ Code poussé vers le repository');
    console.log('✅ Déploiement Vercel réussi');
    console.log('\n🚀 Votre application est maintenant déployée !');
  } else if (buildResult.success) {
    console.log('✅ BUILD RÉUSSI - CODE POUSSÉ');
    console.log('✅ Build testé et validé');
    console.log('✅ Code poussé vers le repository');
    console.log('⚠️  Déploiement Vercel non effectué (optionnel)');
    console.log('\n🚀 Vercel déploiera automatiquement depuis le repository !');
  } else {
    console.log('❌ DÉPLOIEMENT ÉCHOUÉ');
    console.log('🔧 Vérifiez les erreurs ci-dessus');
    process.exit(1);
  }
  
  console.log('\n✨ Processus de déploiement terminé !');
}

// Exécuter le processus principal
main().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
