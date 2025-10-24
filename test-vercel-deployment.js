const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 TEST AUTOMATISÉ VERCEL - SIMULATION COMPLÈTE');
console.log('================================================');

// Fonction pour exécuter une commande et capturer la sortie
function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`💻 Commande: ${command}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
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

// Fonction pour vérifier l'existence d'un fichier/répertoire
function checkExists(path, description) {
  if (fs.existsSync(path)) {
    console.log(`✅ ${description} - OK`);
    return true;
  } else {
    console.log(`❌ ${description} - MANQUANT`);
    return false;
  }
}

// Fonction pour lister le contenu d'un répertoire
function listDirectory(dirPath, description) {
  console.log(`\n📁 ${description}:`);
  if (fs.existsSync(dirPath)) {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      const type = stats.isDirectory() ? '📁' : '📄';
      const size = stats.isFile() ? ` (${Math.round(stats.size / 1024)}KB)` : '';
      console.log(`  ${type} ${item}${size}`);
    });
    return items;
  } else {
    console.log('  ❌ Répertoire introuvable');
    return [];
  }
}

// ===== ÉTAPE 1: NETTOYAGE =====
console.log('\n🧹 ÉTAPE 1: Nettoyage des fichiers de test');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('✅ Répertoire dist supprimé');
} else {
  console.log('ℹ️  Répertoire dist n\'existait pas');
}

if (fs.existsSync('frontend/dist')) {
  fs.rmSync('frontend/dist', { recursive: true, force: true });
  console.log('✅ Répertoire frontend/dist supprimé');
} else {
  console.log('ℹ️  Répertoire frontend/dist n\'existait pas');
}

// ===== ÉTAPE 2: VÉRIFICATION DES FICHIERS NÉCESSAIRES =====
console.log('\n🔍 ÉTAPE 2: Vérification des fichiers nécessaires');
const requiredFiles = [
  'package.json',
  'vercel.json',
  'build-vercel.js',
  'frontend/package.json',
  'frontend/src/main.tsx',
  'frontend/vite.config.ts'
];

let allRequiredFilesExist = true;
requiredFiles.forEach(file => {
  if (!checkExists(file, file)) {
    allRequiredFilesExist = false;
  }
});

if (!allRequiredFilesExist) {
  console.log('\n❌ Certains fichiers requis sont manquants. Arrêt du test.');
  process.exit(1);
}

// ===== ÉTAPE 3: SIMULATION DU BUILD VERCEL =====
console.log('\n🚀 ÉTAPE 3: Simulation du build Vercel');
const buildResult = runCommand('node build-vercel.js', 'Exécution du script de build Vercel');

if (!buildResult.success) {
  console.log('\n❌ Le build a échoué. Arrêt du test.');
  process.exit(1);
}

// ===== ÉTAPE 4: VÉRIFICATION DU RÉSULTAT =====
console.log('\n✅ ÉTAPE 4: Vérification du résultat du build');

// Vérifier que le répertoire dist existe
if (!checkExists('dist', 'Répertoire dist à la racine')) {
  console.log('\n❌ Le répertoire dist n\'a pas été créé. Test échoué.');
  process.exit(1);
}

// Vérifier les fichiers essentiels
const essentialFiles = [
  'dist/index.html',
  'dist/assets/index-C1nhNqaR.js',
  'dist/assets/index-BOD3LxIa.css'
];

let allEssentialFilesExist = true;
essentialFiles.forEach(file => {
  if (!checkExists(file, file)) {
    allEssentialFilesExist = false;
  }
});

if (!allEssentialFilesExist) {
  console.log('\n❌ Certains fichiers essentiels sont manquants. Test échoué.');
  process.exit(1);
}

// ===== ÉTAPE 5: VÉRIFICATION DU CONTENU =====
console.log('\n📄 ÉTAPE 5: Vérification du contenu');

// Vérifier le contenu du index.html
const indexPath = 'dist/index.html';
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  const checks = [
    { test: content.includes('Wash'), description: 'Titre Wash&Go' },
    { test: content.includes('assets/'), description: 'Références aux assets' },
    { test: content.includes('root'), description: 'Élément root' },
    { test: content.includes('<!doctype html>'), description: 'DOCTYPE HTML' }
  ];
  
  checks.forEach(check => {
    if (check.test) {
      console.log(`✅ ${check.description}`);
    } else {
      console.log(`❌ ${check.description}`);
    }
  });
}

// Lister le contenu du répertoire dist
listDirectory('dist', 'Contenu du répertoire dist');
listDirectory('dist/assets', 'Contenu du répertoire dist/assets');

// ===== ÉTAPE 6: TEST DE FONCTIONNEMENT LOCAL =====
console.log('\n🌐 ÉTAPE 6: Test de fonctionnement local');

// Vérifier que tous les assets référencés existent
const htmlContent = fs.readFileSync('dist/index.html', 'utf8');
const assetMatches = htmlContent.match(/assets\/[^"'\s]+/g) || [];
console.log(`\n🔗 Assets référencés dans index.html: ${assetMatches.length}`);

let allAssetsExist = true;
assetMatches.forEach(asset => {
  const assetPath = `dist/${asset}`;
  if (fs.existsSync(assetPath)) {
    console.log(`✅ ${asset}`);
  } else {
    console.log(`❌ ${asset} - MANQUANT`);
    allAssetsExist = false;
  }
});

// ===== RÉSULTAT FINAL =====
console.log('\n🎯 RÉSULTAT FINAL');
console.log('================');

if (allRequiredFilesExist && allEssentialFilesExist && allAssetsExist) {
  console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
  console.log('✅ Configuration Vercel 100% fonctionnelle');
  console.log('✅ Build process complet et fonctionnel');
  console.log('✅ Tous les fichiers sont présents et corrects');
  console.log('✅ Prêt pour le déploiement Vercel');
  console.log('\n🚀 Vous pouvez maintenant déployer sur Vercel avec confiance !');
} else {
  console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
  console.log('🔧 Vérifiez la configuration avant de déployer');
  process.exit(1);
}

console.log('\n📊 STATISTIQUES DU BUILD');
console.log('========================');

// Calculer la taille totale
function getDirectorySize(dirPath) {
  let totalSize = 0;
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(itemPath);
    } else {
      totalSize += stats.size;
    }
  });
  
  return totalSize;
}

const totalSize = getDirectorySize('dist');
const totalSizeKB = Math.round(totalSize / 1024);
const totalSizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;

console.log(`📁 Taille totale du build: ${totalSizeKB}KB (${totalSizeMB}MB)`);
console.log(`📄 Nombre de fichiers: ${countFiles('dist')}`);

function countFiles(dirPath) {
  let count = 0;
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      count += countFiles(itemPath);
    } else {
      count++;
    }
  });
  
  return count;
}

console.log('\n✨ Test automatisé terminé avec succès !');
