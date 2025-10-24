// Script de test pour vérifier les connexions sur l'URL de production
console.log('🌐 TEST DE L\'APPLICATION EN PRODUCTION');
console.log('=====================================');
console.log('URL: https://erp-washand-go-frontend.vercel.app/');
console.log('');

// Test de l'application frontend
async function testFrontend() {
  console.log('🖥️ Test de l\'application frontend...');
  
  try {
    const response = await fetch('https://erp-washand-go-frontend.vercel.app/');
    
    if (response.ok) {
      const html = await response.text();
      console.log('✅ Application accessible');
      
      // Vérifier le contenu
      if (html.includes('Wash&Go') || html.includes('Wash')) {
        console.log('✅ Contenu HTML valide');
        return true;
      } else {
        console.log('❌ Contenu HTML invalide');
        return false;
      }
    } else {
      console.log(`❌ Erreur HTTP: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur de connexion: ${error.message}`);
    return false;
  }
}

// Test de l'API Google Calendar
async function testGoogleCalendarAPI() {
  console.log('\n📅 Test de l\'API Google Calendar...');
  
  try {
    // Test pour Adrien
    console.log('  🔍 Test du calendrier Adrien...');
    const responseAdrien = await fetch('https://erp-washand-go-frontend.vercel.app/api/planning-google?user=adrien&rangeDays=7');
    
    if (responseAdrien.ok) {
      const dataAdrien = await responseAdrien.json();
      console.log(`  ✅ Calendrier Adrien: ${dataAdrien.events?.length || 0} événements`);
      if (dataAdrien.warnings?.length > 0) {
        console.log(`  ⚠️ Avertissements Adrien: ${dataAdrien.warnings.join(', ')}`);
      }
    } else {
      console.log(`  ❌ Erreur calendrier Adrien: ${responseAdrien.status}`);
    }
    
    // Test pour Clément
    console.log('  🔍 Test du calendrier Clément...');
    const responseClement = await fetch('https://erp-washand-go-frontend.vercel.app/api/planning-google?user=clement&rangeDays=7');
    
    if (responseClement.ok) {
      const dataClement = await responseClement.json();
      console.log(`  ✅ Calendrier Clément: ${dataClement.events?.length || 0} événements`);
      if (dataClement.warnings?.length > 0) {
        console.log(`  ⚠️ Avertissements Clément: ${dataClement.warnings.join(', ')}`);
      }
    } else {
      console.log(`  ❌ Erreur calendrier Clément: ${responseClement.status}`);
    }
    
    return responseAdrien.ok && responseClement.ok;
  } catch (error) {
    console.log(`  ❌ Erreur API Google Calendar: ${error.message}`);
    return false;
  }
}

// Test de l'API Supabase (via l'application)
async function testSupabaseAPI() {
  console.log('\n💾 Test de l\'API Supabase...');
  
  try {
    // Test de l'endpoint de test Supabase
    const response = await fetch('https://erp-washand-go-frontend.vercel.app/api/test-supabase');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Supabase accessible');
      console.log(`📊 Statut: ${data.status || 'OK'}`);
      return true;
    } else {
      console.log(`❌ Erreur API Supabase: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur de connexion Supabase: ${error.message}`);
    return false;
  }
}

// Test de création d'événement (simulation)
async function testEventCreation() {
  console.log('\n✏️ Test de création d\'événement...');
  
  try {
    // Test de création d'événement pour Adrien
    const testEvent = {
      summary: 'TEST ADRIEN - ' + new Date().toISOString(),
      description: 'Événement de test créé automatiquement',
      start: {
        dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        timeZone: 'Europe/Paris',
      },
      end: {
        dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Europe/Paris',
      },
    };
    
    console.log('  🔍 Test de création d\'événement pour Adrien...');
    const response = await fetch('https://erp-washand-go-frontend.vercel.app/api/planning-google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        user: 'adrien',
        event: testEvent,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Événement créé pour Adrien');
      console.log(`  📅 ID: ${data.eventId || 'N/A'}`);
      return true;
    } else {
      console.log(`  ❌ Erreur création événement: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Erreur de création d'événement: ${error.message}`);
    return false;
  }
}

// Test de la page de planning
async function testPlanningPage() {
  console.log('\n📋 Test de la page de planning...');
  
  try {
    const response = await fetch('https://erp-washand-go-frontend.vercel.app/planning');
    
    if (response.ok) {
      const html = await response.text();
      if (html.includes('planning') || html.includes('Planning')) {
        console.log('✅ Page de planning accessible');
        return true;
      } else {
        console.log('❌ Contenu de la page de planning invalide');
        return false;
      }
    } else {
      console.log(`❌ Erreur page de planning: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur de connexion page de planning: ${error.message}`);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests de production...');
  
  const frontendTest = await testFrontend();
  const googleCalendarTest = await testGoogleCalendarAPI();
  const supabaseTest = await testSupabaseAPI();
  const eventCreationTest = await testEventCreation();
  const planningPageTest = await testPlanningPage();
  
  console.log('\n🎯 RÉSULTATS FINAUX');
  console.log('==================');
  console.log(`Application frontend: ${frontendTest ? '✅' : '❌'}`);
  console.log(`API Google Calendar: ${googleCalendarTest ? '✅' : '❌'}`);
  console.log(`API Supabase: ${supabaseTest ? '✅' : '❌'}`);
  console.log(`Création d'événement: ${eventCreationTest ? '✅' : '❌'}`);
  console.log(`Page de planning: ${planningPageTest ? '✅' : '❌'}`);
  
  const allTestsPassed = frontendTest && googleCalendarTest && supabaseTest && eventCreationTest && planningPageTest;
  
  if (allTestsPassed) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('✅ L\'application est pleinement opérationnelle en production');
    console.log('✅ Google Calendar et Supabase sont fonctionnels');
    console.log('✅ Le planning est utilisable');
  } else {
    console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔧 Vérifiez la configuration des variables d\'environnement');
    console.log('🔧 Vérifiez la configuration Google Calendar et Supabase');
  }
  
  console.log('\n📋 INSTRUCTIONS POUR LE TEST MANUEL');
  console.log('===================================');
  console.log('1. Aller sur: https://erp-washand-go-frontend.vercel.app/');
  console.log('2. Se connecter avec les identifiants de test');
  console.log('3. Aller sur la page Planning');
  console.log('4. Créer un événement "TEST ADRIEN"');
  console.log('5. Créer un événement "TEST CLEMENT"');
  console.log('6. Vérifier dans Google Calendar');
  console.log('7. Modifier et supprimer les événements');
}

// Exécuter les tests
runAllTests().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
