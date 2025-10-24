import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Starting Vercel build process...');

// Étape 1: Build du frontend (nous sommes déjà dans le répertoire frontend)
console.log('📦 Building frontend...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Étape 2: Copier les fichiers vers le répertoire parent
console.log('📁 Copying build files...');
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copier dist vers ../dist (répertoire parent)
copyDir('dist', '../dist');
console.log('✅ Build files copied to ../dist directory');
console.log('🎉 Vercel build process completed successfully!');
