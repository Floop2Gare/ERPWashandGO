// Script de test Supabase simple
// À exécuter dans la console du navigateur après avoir chargé l'application

console.log('🧪 Test Supabase - ERP Wash&Go');

// Configuration (à adapter avec vos vraies valeurs)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Fonction pour tester la connexion
async function testSupabaseConnection() {
    console.log('🔌 Test de connexion Supabase...');
    
    try {
        // Import dynamique de Supabase
        const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test simple
        const { data, error } = await supabase.from('companies').select('count').limit(1);
        
        if (error) {
            console.error('❌ Erreur de connexion:', error.message);
            return false;
        } else {
            console.log('✅ Connexion réussie!');
            return true;
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        return false;
    }
}

// Fonction pour tester les tables
async function testSupabaseTables() {
    console.log('📊 Test des tables...');
    
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

// Fonction pour tester la création de données
async function testSupabaseCreate() {
    console.log('🏢 Test de création d\'entreprise...');
    
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

// Fonction pour tester le stockage
async function testSupabaseStorage() {
    console.log('📁 Test stockage PDF...');
    
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
        // Vérifier si le bucket existe
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

// Fonction principale
async function runAllTests() {
    console.log('🚀 Début des tests Supabase...');
    
    const tests = [
        { name: 'Connexion', fn: testSupabaseConnection },
        { name: 'Tables', fn: testSupabaseTables },
        { name: 'Création', fn: testSupabaseCreate },
        { name: 'Stockage', fn: testSupabaseStorage }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`\n🧪 Test: ${test.name}`);
            const result = await test.fn();
            if (result !== false) {
                passed++;
            } else {
                failed++;
            }
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

// Exporter les fonctions
window.testSupabaseConnection = testSupabaseConnection;
window.testSupabaseTables = testSupabaseTables;
window.testSupabaseCreate = testSupabaseCreate;
window.testSupabaseStorage = testSupabaseStorage;
window.runAllTests = runAllTests;

console.log('✅ Script de test chargé!');
console.log('💡 Utilisez runAllTests() pour lancer tous les tests');
console.log('💡 Ou testez individuellement: testSupabaseConnection(), testSupabaseTables(), etc.');
