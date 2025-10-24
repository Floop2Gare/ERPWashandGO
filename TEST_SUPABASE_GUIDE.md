# 🧪 Guide de Test Supabase - ERP Wash&Go

## 🎯 Objectif
Vérifier que la configuration Supabase est correcte et que toutes les fonctionnalités fonctionnent.

## 📋 Prérequis
- ✅ Projet Supabase créé
- ✅ Tables créées (script `database/schema.sql` exécuté)
- ✅ Bucket `documents` créé dans Storage
- ✅ Variables d'environnement configurées

## 🚀 Tests à Effectuer

### **Test 1 : Vérification de la Configuration**

#### 1.1 Vérifier les variables d'environnement
```bash
# Dans le dossier frontend/
# Créer le fichier .env.local avec vos vraies valeurs :
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 1.2 Démarrer l'application
```bash
cd frontend
npm run dev
```

### **Test 2 : Test de Connexion**

#### 2.1 Ouvrir la console du navigateur
- Appuyer sur F12
- Aller dans l'onglet "Console"

#### 2.2 Exécuter le test de connexion
```javascript
// Copier-coller ce code dans la console :

// Configuration (remplacer par vos vraies valeurs)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Test de connexion
async function testConnection() {
    try {
        const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase.from('companies').select('count').limit(1);
        
        if (error) {
            console.error('❌ Erreur:', error.message);
        } else {
            console.log('✅ Connexion réussie!');
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

// Lancer le test
testConnection();
```

### **Test 3 : Test des Tables**

#### 3.1 Vérifier que toutes les tables existent
```javascript
async function testTables() {
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const tables = ['companies', 'clients', 'services', 'engagements', 'auth_users', 'documents'];
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            
            if (error) {
                console.error(`❌ Table ${table}:`, error.message);
            } else {
                console.log(`✅ Table ${table}: OK`);
            }
        } catch (error) {
            console.error(`❌ Table ${table}:`, error.message);
        }
    }
}

testTables();
```

### **Test 4 : Test de Création de Données**

#### 4.1 Tester la création d'une entreprise
```javascript
async function testCreateCompany() {
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
        const testCompany = {
            name: 'Test Company ' + Date.now(),
            address: '123 Test Street',
            city: 'Test City',
            postal_code: '12345',
            phone: '+33 1 23 45 67 89',
            email: 'test@example.com',
            siret: '12345678901234'
        };

        const { data, error } = await supabase
            .from('companies')
            .insert(testCompany)
            .select()
            .single();

        if (error) {
            console.error('❌ Erreur création:', error.message);
        } else {
            console.log('✅ Entreprise créée:', data.id);
            
            // Nettoyer
            await supabase.from('companies').delete().eq('id', data.id);
            console.log('✅ Entreprise supprimée');
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testCreateCompany();
```

### **Test 5 : Test du Stockage PDF**

#### 5.1 Vérifier le bucket Storage
```javascript
async function testStorage() {
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
        const { data, error } = await supabase.storage.from('documents').list();
        
        if (error) {
            console.error('❌ Bucket documents non trouvé:', error.message);
            console.log('💡 Créez le bucket "documents" dans Supabase Storage');
        } else {
            console.log('✅ Bucket documents accessible');
        }
    } catch (error) {
        console.error('❌ Erreur stockage:', error.message);
    }
}

testStorage();
```

### **Test 6 : Test Complet**

#### 6.1 Lancer tous les tests
```javascript
async function runAllTests() {
    console.log('🚀 Début des tests Supabase...');
    
    const tests = [
        { name: 'Connexion', fn: testConnection },
        { name: 'Tables', fn: testTables },
        { name: 'Création', fn: testCreateCompany },
        { name: 'Stockage', fn: testStorage }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`\n🧪 Test: ${test.name}`);
            await test.fn();
            passed++;
        } catch (error) {
            console.error(`❌ Test ${test.name} échoué:`, error);
            failed++;
        }
    }

    console.log(`\n📊 Résultats des tests:`);
    console.log(`✅ Réussis: ${passed}`);
    console.log(`❌ Échoués: ${failed}`);
    console.log(`📈 Taux de réussite: ${Math.round((passed / (passed + failed)) * 100)}%`);
}

runAllTests();
```

## 🔧 Dépannage

### **Erreurs courantes**

#### "Invalid API key"
- ✅ Vérifier que la clé API est correcte
- ✅ Vérifier que l'URL du projet est correcte
- ✅ Vérifier que le projet Supabase est actif

#### "relation does not exist"
- ✅ Exécuter le script `database/schema.sql` dans Supabase
- ✅ Vérifier que toutes les tables sont créées
- ✅ Vérifier les permissions RLS

#### "bucket not found"
- ✅ Créer le bucket `documents` dans Supabase Storage
- ✅ Configurer les permissions du bucket
- ✅ Vérifier que le bucket est public

#### "permission denied"
- ✅ Vérifier les politiques RLS
- ✅ Vérifier les permissions de l'utilisateur
- ✅ Vérifier que l'authentification est configurée

### **Solutions**

#### Si les tests échouent :
1. **Vérifier la configuration Supabase**
   - Aller dans Settings > API
   - Copier l'URL et la clé anonyme

2. **Vérifier les tables**
   - Aller dans Table Editor
   - Vérifier que toutes les tables existent

3. **Vérifier le stockage**
   - Aller dans Storage
   - Créer le bucket `documents`
   - Configurer les permissions

4. **Vérifier les variables d'environnement**
   - Créer `.env.local` dans `frontend/`
   - Redémarrer l'application

## ✅ Résultat Attendu

Après tous les tests, vous devriez voir :
- ✅ Connexion réussie
- ✅ Toutes les tables accessibles
- ✅ Création de données fonctionnelle
- ✅ Stockage accessible
- ✅ Taux de réussite : 100%

## 🎉 Prochaines Étapes

Une fois les tests réussis :
1. **Migrer les données** avec le script de migration
2. **Tester l'application** complètement
3. **Déployer sur Vercel** avec les variables d'environnement
4. **Vérifier en production** que tout fonctionne

## 📞 Support

En cas de problème :
1. Vérifier les logs de la console
2. Vérifier les logs Supabase
3. Consulter la documentation Supabase
4. Contacter le support si nécessaire
