// Script de test complet pour la production Vercel
console.log('🚀 TEST COMPLET DE PRODUCTION VERCEL');
console.log('===================================');
console.log('URL de production: https://erp-washand-go-frontend.vercel.app/');
console.log('');

// Test des variables d'environnement
console.log('🔍 ÉTAPE 1: Vérification des variables d\'environnement');
console.log('======================================================');

// Variables Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('📊 Variables Supabase:');
console.log(`VITE_SUPABASE_URL: ${supabaseUrl ? '✅ DÉFINIE' : '❌ NON DÉFINIE'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ DÉFINIE' : '❌ NON DÉFINIE'}`);

// Variables Google Calendar
const googleSaAdrien = process.env.GOOGLE_SA_ADRIEN;
const googleSaClement = process.env.GOOGLE_SA_CLEMENT;
const googleCalendarIdAdrien = process.env.GOOGLE_CALENDAR_ID_ADRIEN;
const googleCalendarIdClement = process.env.GOOGLE_CALENDAR_ID_CLEMENT;

console.log('\n📅 Variables Google Calendar:');
console.log(`GOOGLE_SA_ADRIEN: ${googleSaAdrien ? '✅ DÉFINIE' : '❌ NON DÉFINIE'}`);
console.log(`GOOGLE_SA_CLEMENT: ${googleSaClement ? '✅ DÉFINIE' : '❌ NON DÉFINIE'}`);
console.log(`GOOGLE_CALENDAR_ID_ADRIEN: ${googleCalendarIdAdrien || '❌ NON DÉFINIE'}`);
console.log(`GOOGLE_CALENDAR_ID_CLEMENT: ${googleCalendarIdClement || '❌ NON DÉFINIE'}`);

// Test de la configuration
console.log('\n🔧 ÉTAPE 2: Vérification de la configuration');
console.log('===========================================');

const configStatus = {
  supabase: !!(supabaseUrl && supabaseAnonKey),
  googleAdrien: !!(googleSaAdrien && googleCalendarIdAdrien),
  googleClement: !!(googleSaClement && googleCalendarIdClement),
};

console.log('📋 Statut de la configuration:');
console.log(`Supabase: ${configStatus.supabase ? '✅' : '❌'}`);
console.log(`Google Calendar Adrien: ${configStatus.googleAdrien ? '✅' : '❌'}`);
console.log(`Google Calendar Clément: ${configStatus.googleClement ? '✅' : '❌'}`);

// Test de parsing des Service Accounts
console.log('\n🧪 ÉTAPE 3: Test de parsing des Service Accounts');
console.log('==============================================');

function testServiceAccountParsing(serviceAccountJson, name) {
  if (!serviceAccountJson) {
    console.log(`${name}: ❌ Service Account non défini`);
    return false;
  }
  
  try {
    const parsed = JSON.parse(serviceAccountJson);
    console.log(`${name}: ✅ JSON valide - Type: ${parsed.type || 'N/A'}`);
    return true;
  } catch (error) {
    console.log(`${name}: ❌ JSON invalide - ${error.message}`);
    return false;
  }
}

const adrienParsing = testServiceAccountParsing(googleSaAdrien, 'Adrien');
const clementParsing = testServiceAccountParsing(googleSaClement, 'Clément');

// Test de l'API Vercel
console.log('\n🌐 ÉTAPE 4: Test de l\'API Vercel');
console.log('================================');

async function testVercelAPI() {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://erp-washand-go-frontend.vercel.app';
    
    console.log(`Test de l'API: ${baseUrl}/api/planning-google`);
    
    const response = await fetch(`${baseUrl}/api/planning-google?user=adrien&rangeDays=7`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Google Calendar accessible');
      console.log(`📊 Événements trouvés: ${data.events?.length || 0}`);
      console.log(`⚠️ Avertissements: ${data.warnings?.length || 0}`);
      return true;
    } else {
      console.log(`❌ Erreur API: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur de connexion API: ${error.message}`);
    return false;
  }
}

// Test de l'application frontend
console.log('\n🖥️ ÉTAPE 5: Test de l\'application frontend');
console.log('========================================');

async function testFrontend() {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://erp-washand-go-frontend.vercel.app';
    
    console.log(`Test de l'application: ${baseUrl}`);
    
    const response = await fetch(baseUrl);
    
    if (response.ok) {
      const html = await response.text();
      if (html.includes('Wash&Go') || html.includes('Wash')) {
        console.log('✅ Application frontend accessible');
        console.log('✅ Contenu HTML valide');
        return true;
      } else {
        console.log('❌ Contenu HTML invalide');
        return false;
      }
    } else {
      console.log(`❌ Erreur application: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur de connexion application: ${error.message}`);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests complets...');
  
  const apiTest = await testVercelAPI();
  const frontendTest = await testFrontend();
  
  console.log('\n🎯 RÉSULTATS FINAUX');
  console.log('==================');
  console.log(`Variables d'environnement: ${configStatus.supabase && configStatus.googleAdrien && configStatus.googleClement ? '✅' : '❌'}`);
  console.log(`Parsing Service Accounts: ${adrienParsing && clementParsing ? '✅' : '❌'}`);
  console.log(`API Vercel: ${apiTest ? '✅' : '❌'}`);
  console.log(`Application frontend: ${frontendTest ? '✅' : '❌'}`);
  
  const allTestsPassed = configStatus.supabase && configStatus.googleAdrien && configStatus.googleClement && 
                        adrienParsing && clementParsing && apiTest && frontendTest;
  
  if (allTestsPassed) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('✅ L\'application est pleinement opérationnelle en production');
    console.log('✅ Google Calendar et Supabase sont configurés correctement');
    console.log('✅ L\'application est accessible et fonctionnelle');
  } else {
    console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔧 Vérifiez la configuration des variables d\'environnement');
    console.log('🔧 Vérifiez la configuration Google Calendar et Supabase');
  }
  
  console.log('\n📋 RÉSUMÉ DES CONFIGURATIONS');
  console.log('============================');
  console.log('Variables requises:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY');
  console.log('- GOOGLE_SA_ADRIEN (JSON du Service Account)');
  console.log('- GOOGLE_SA_CLEMENT (JSON du Service Account)');
  console.log('- GOOGLE_CALENDAR_ID_ADRIEN');
  console.log('- GOOGLE_CALENDAR_ID_CLEMENT');
  
  console.log('\n🔗 URLs de test:');
  console.log('- Application: https://erp-washand-go-frontend.vercel.app/');
  console.log('- API Google Calendar: https://erp-washand-go-frontend.vercel.app/api/planning-google');
}

// Exécuter les tests
runAllTests().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
