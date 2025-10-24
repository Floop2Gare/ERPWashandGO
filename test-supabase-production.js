// Script de test pour vérifier la connexion Supabase en production
import { createClient } from '@supabase/supabase-js';

console.log('🔍 TEST DE CONNEXION SUPABASE EN PRODUCTION');
console.log('==========================================');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('\n📊 Configuration Supabase:');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'DÉFINIE' : 'NON DÉFINIE');

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test de connexion
async function testSupabaseConnection() {
  console.log('\n🧪 Test de connexion Supabase...');
  
  try {
    // Test 1: Vérifier la connexion de base
    const { data, error } = await supabase.from('companies').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erreur de connexion:', error.message);
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie');
    
    // Test 2: Vérifier les tables principales
    const tables = ['companies', 'clients', 'services', 'engagements'];
    console.log('\n📋 Test des tables:');
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erreur fatale:', error.message);
    return false;
  }
}

// Test de lecture/écriture
async function testSupabaseReadWrite() {
  console.log('\n📝 Test de lecture/écriture...');
  
  try {
    // Test de lecture
    const { data: companies, error: readError } = await supabase
      .from('companies')
      .select('*')
      .limit(5);
    
    if (readError) {
      console.log('❌ Erreur de lecture:', readError.message);
      return false;
    }
    
    console.log(`✅ Lecture réussie: ${companies?.length || 0} entreprises trouvées`);
    
    // Test d'écriture (création d'un enregistrement de test)
    const testCompany = {
      name: 'Test Company ' + Date.now(),
      email: 'test@example.com',
      phone: '0123456789',
      address: '123 Test Street',
      created_at: new Date().toISOString()
    };
    
    const { data: newCompany, error: writeError } = await supabase
      .from('companies')
      .insert(testCompany)
      .select()
      .single();
    
    if (writeError) {
      console.log('❌ Erreur d\'écriture:', writeError.message);
      return false;
    }
    
    console.log('✅ Écriture réussie: Entreprise de test créée');
    
    // Nettoyer l'enregistrement de test
    if (newCompany?.id) {
      await supabase.from('companies').delete().eq('id', newCompany.id);
      console.log('✅ Nettoyage: Enregistrement de test supprimé');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erreur de lecture/écriture:', error.message);
    return false;
  }
}

// Test du stockage
async function testSupabaseStorage() {
  console.log('\n📁 Test du stockage Supabase...');
  
  try {
    // Vérifier si le bucket 'documents' existe
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Erreur de liste des buckets:', bucketsError.message);
      return false;
    }
    
    const documentsBucket = buckets?.find(bucket => bucket.name === 'documents');
    if (!documentsBucket) {
      console.log('❌ Bucket "documents" non trouvé');
      return false;
    }
    
    console.log('✅ Bucket "documents" trouvé');
    
    // Test d'upload d'un fichier de test
    const testContent = 'Test file content';
    const testFileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.log('❌ Erreur d\'upload:', uploadError.message);
      return false;
    }
    
    console.log('✅ Upload réussi:', uploadData?.path);
    
    // Nettoyer le fichier de test
    await supabase.storage.from('documents').remove([testFileName]);
    console.log('✅ Nettoyage: Fichier de test supprimé');
    
    return true;
  } catch (error) {
    console.log('❌ Erreur de stockage:', error.message);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests Supabase...');
  
  const connectionTest = await testSupabaseConnection();
  const readWriteTest = await testSupabaseReadWrite();
  const storageTest = await testSupabaseStorage();
  
  console.log('\n🎯 RÉSULTATS FINAUX');
  console.log('==================');
  console.log(`Connexion: ${connectionTest ? '✅' : '❌'}`);
  console.log(`Lecture/Écriture: ${readWriteTest ? '✅' : '❌'}`);
  console.log(`Stockage: ${storageTest ? '✅' : '❌'}`);
  
  if (connectionTest && readWriteTest && storageTest) {
    console.log('\n🎉 TOUS LES TESTS SUPABASE SONT PASSÉS !');
    console.log('✅ Supabase est pleinement opérationnel en production');
  } else {
    console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔧 Vérifiez la configuration Supabase');
  }
}

// Exécuter les tests
runAllTests().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
