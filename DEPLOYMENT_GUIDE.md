# 🚀 Guide de Déploiement ERP Wash&Go avec Supabase

## 📋 Prérequis

- ✅ Compte Supabase (gratuit)
- ✅ Compte Vercel (gratuit)
- ✅ Node.js installé localement
- ✅ Git configuré

## 🎯 Étapes de Déploiement

### **Étape 1 : Configuration Supabase**

#### 1.1 Créer un projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un compte et un nouveau projet
3. Noter l'URL du projet et la clé API

#### 1.2 Créer les tables
1. Aller dans l'éditeur SQL de Supabase
2. Copier et exécuter le contenu de `database/schema.sql`
3. Vérifier que toutes les tables sont créées

#### 1.3 Configurer le stockage
1. Aller dans Storage > Buckets
2. Créer un bucket nommé `documents`
3. Configurer les permissions (public read)

### **Étape 2 : Configuration Locale**

#### 2.1 Variables d'environnement
Créer un fichier `.env.local` dans le dossier `frontend/` :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 2.2 Tester localement
```bash
cd frontend
npm install
npm run dev
```

Ouvrir la console du navigateur et exécuter :
```javascript
// Tester la connexion
window.testSupabase()
```

### **Étape 3 : Migration des Données**

#### 3.1 Lancer la migration
Dans la console du navigateur :
```javascript
import { DataMigration } from './src/lib/migration'

// Vérifier si migration nécessaire
DataMigration.isMigrationNeeded().then(needed => {
  if (needed) {
    DataMigration.migrateAllData()
  }
})
```

### **Étape 4 : Déploiement Vercel**

#### 4.1 Configuration Vercel
1. Aller sur [vercel.com](https://vercel.com)
2. Connecter le repository GitHub
3. Configurer les variables d'environnement :
   - `VITE_SUPABASE_URL` = URL de votre projet Supabase
   - `VITE_SUPABASE_ANON_KEY` = Clé anonyme de Supabase

#### 4.2 Déploiement
```bash
# Depuis la racine du projet
vercel --prod
```

### **Étape 5 : Post-Déploiement**

#### 5.1 Vérifier le déploiement
1. Aller sur l'URL Vercel
2. Tester la connexion à la base de données
3. Vérifier que les données sont persistées

#### 5.2 Configuration finale
1. Configurer les domaines personnalisés (optionnel)
2. Configurer les backups Supabase (recommandé)
3. Configurer les webhooks (optionnel)

## 🔧 Configuration Avancée

### **Sécurité**
- Configurer RLS (Row Level Security) dans Supabase
- Implémenter l'authentification JWT
- Configurer les CORS

### **Performance**
- Configurer les index de base de données
- Optimiser les requêtes
- Configurer le cache

### **Monitoring**
- Configurer les logs Vercel
- Configurer les métriques Supabase
- Configurer les alertes

## 🆘 Dépannage

### **Erreurs courantes**

#### "Supabase connection failed"
- Vérifier les variables d'environnement
- Vérifier l'URL et la clé API
- Vérifier les permissions RLS

#### "Migration failed"
- Vérifier que les tables existent
- Vérifier les permissions d'écriture
- Vérifier les contraintes de base de données

#### "PDF generation failed"
- Vérifier la configuration du bucket Storage
- Vérifier les permissions de stockage
- Vérifier la taille des fichiers

### **Logs utiles**
```bash
# Logs Vercel
vercel logs

# Logs Supabase
# Aller dans le dashboard Supabase > Logs
```

## 📊 Monitoring et Maintenance

### **Métriques importantes**
- Nombre de requêtes Supabase
- Taille du stockage
- Performance des requêtes
- Erreurs d'application

### **Maintenance régulière**
- Nettoyer les anciens fichiers
- Optimiser les requêtes lentes
- Mettre à jour les dépendances
- Sauvegarder les données

## 🎉 Résultat Final

Après le déploiement, vous aurez :
- ✅ Application ERP fonctionnelle
- ✅ Base de données persistante
- ✅ Stockage des PDF
- ✅ Déploiement automatique
- ✅ Monitoring intégré

## 📞 Support

En cas de problème :
1. Vérifier les logs Vercel
2. Vérifier les logs Supabase
3. Consulter la documentation
4. Contacter le support si nécessaire
