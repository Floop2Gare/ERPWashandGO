# 🚀 Guide de Déploiement Vercel - ERP Wash&Go

## 🎯 Objectif
Déployer l'ERP Wash&Go sur Vercel avec Supabase en quelques étapes simples.

## 📋 Prérequis
- ✅ Compte Vercel (gratuit)
- ✅ Compte Supabase (gratuit)
- ✅ Projet Supabase configuré
- ✅ Tables créées (script `database/schema.sql`)

## 🚀 Déploiement Rapide

### **Option 1 : Déploiement Automatique (Recommandé)**

#### 1.1 Installer Vercel CLI
```bash
npm install -g vercel
```

#### 1.2 Lancer le déploiement
```bash
# Sur Windows
deploy-vercel.bat

# Sur Linux/Mac
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

#### 1.3 Ou utiliser npm
```bash
npm run deploy
```

### **Option 2 : Déploiement Manuel**

#### 2.1 Préparer le projet
```bash
# Installer les dépendances
npm install

# Aller dans frontend
cd frontend
npm install
cd ..
```

#### 2.2 Déployer
```bash
vercel --prod
```

## 🔧 Configuration Post-Déploiement

### **Étape 1 : Configurer Supabase**

#### 1.1 Créer un projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé API

#### 1.2 Créer les tables
1. Aller dans l'éditeur SQL de Supabase
2. Copier et exécuter le contenu de `database/schema.sql`
3. Vérifier que toutes les tables sont créées

#### 1.3 Configurer le stockage
1. Aller dans Storage > Buckets
2. Créer un bucket nommé `documents`
3. Configurer les permissions (public read)

### **Étape 2 : Configurer Vercel**

#### 2.1 Aller dans le dashboard Vercel
1. Sélectionner votre projet
2. Aller dans Settings > Environment Variables

#### 2.2 Ajouter les variables d'environnement
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
```

#### 2.3 Redéployer
```bash
vercel --prod
```

## 🧪 Test du Déploiement

### **Test 1 : Vérifier l'application**
1. Aller sur l'URL Vercel
2. Vérifier que l'application se charge
3. Tester la connexion

### **Test 2 : Tester Supabase**
1. Ouvrir la console du navigateur (F12)
2. Exécuter le test de connexion :

```javascript
// Test de connexion Supabase
async function testSupabase() {
    try {
        const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
        const supabase = createClient(
            'https://your-project.supabase.co',
            'your-anon-key'
        );
        
        const { data, error } = await supabase.from('companies').select('count').limit(1);
        
        if (error) {
            console.error('❌ Erreur:', error.message);
        } else {
            console.log('✅ Connexion Supabase réussie!');
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testSupabase();
```

### **Test 3 : Migrer les données**
```javascript
// Migration des données
async function migrateData() {
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(
        'https://your-project.supabase.co',
        'your-anon-key'
    );
    
    // Créer une entreprise de test
    const { data, error } = await supabase
        .from('companies')
        .insert({
            name: 'Wash&Go Fuveau',
            address: '123 Avenue de la République',
            city: 'Fuveau',
            postal_code: '13710',
            phone: '+33 4 42 12 34 56',
            email: 'contact@washandgo-fuveau.fr',
            siret: '12345678901234',
            vat_enabled: true,
            vat_rate: 20.00,
            is_default: true
        })
        .select()
        .single();
    
    if (error) {
        console.error('❌ Erreur migration:', error.message);
    } else {
        console.log('✅ Migration réussie:', data.id);
    }
}

migrateData();
```

## 🔧 Configuration Avancée

### **Variables d'environnement Vercel**

#### Variables requises :
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
```

#### Variables optionnelles :
```
VITE_APP_NAME = ERP Wash&Go
VITE_APP_VERSION = 1.0.0
```

### **Configuration du domaine**

#### Domaine personnalisé :
1. Aller dans Settings > Domains
2. Ajouter votre domaine
3. Configurer les DNS

#### SSL automatique :
- ✅ Vercel configure automatiquement le SSL
- ✅ HTTPS activé par défaut

## 📊 Monitoring

### **Métriques Vercel**
- 📈 **Visiteurs** - Nombre de visiteurs
- ⚡ **Performance** - Temps de chargement
- 🔄 **Déploiements** - Historique des déploiements
- 📊 **Logs** - Logs d'application

### **Métriques Supabase**
- 💾 **Stockage** - Taille de la base de données
- 🔄 **Requêtes** - Nombre de requêtes
- 📁 **Fichiers** - Stockage des PDF
- 🔒 **Sécurité** - Logs d'authentification

## 🆘 Dépannage

### **Erreurs courantes**

#### "Build failed"
- ✅ Vérifier que Node.js >= 18
- ✅ Vérifier les dépendances
- ✅ Vérifier les variables d'environnement

#### "Supabase connection failed"
- ✅ Vérifier l'URL et la clé API
- ✅ Vérifier que le projet Supabase est actif
- ✅ Vérifier les permissions RLS

#### "Storage not found"
- ✅ Créer le bucket `documents` dans Supabase
- ✅ Configurer les permissions
- ✅ Vérifier que le bucket est public

### **Solutions**

#### Si le déploiement échoue :
1. **Vérifier les logs Vercel**
   - Aller dans Functions > Logs
   - Identifier l'erreur

2. **Vérifier les variables d'environnement**
   - Aller dans Settings > Environment Variables
   - Vérifier que toutes les variables sont définies

3. **Vérifier la configuration Supabase**
   - Vérifier que les tables existent
   - Vérifier que le bucket existe
   - Vérifier les permissions

## 🎉 Résultat Final

Après le déploiement, vous aurez :
- ✅ **Application ERP déployée** sur Vercel
- ✅ **Base de données persistante** avec Supabase
- ✅ **Stockage des PDF** fonctionnel
- ✅ **Déploiement automatique** à chaque push
- ✅ **Monitoring intégré** Vercel + Supabase

## 📞 Support

En cas de problème :
1. Vérifier les logs Vercel
2. Vérifier les logs Supabase
3. Consulter la documentation
4. Contacter le support si nécessaire

## 🚀 Prochaines Étapes

1. **Déployer l'application** avec les scripts fournis
2. **Configurer Supabase** et créer les tables
3. **Configurer les variables d'environnement** dans Vercel
4. **Tester l'application** en production
5. **Migrer les données** si nécessaire
6. **Configurer le monitoring** et les alertes
