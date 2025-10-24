// Script de test pour vérifier la connexion Google Calendar en production
import { google } from 'googleapis';

console.log('🔍 TEST DE CONNEXION GOOGLE CALENDAR EN PRODUCTION');
console.log('==================================================');

// Configuration des calendriers
const CALENDAR_CONFIGS = {
  adrien: {
    calendarId: process.env.GOOGLE_CALENDAR_ID_ADRIEN,
    serviceAccountJson: process.env.GOOGLE_SA_ADRIEN,
  },
  clement: {
    calendarId: process.env.GOOGLE_CALENDAR_ID_CLEMENT,
    serviceAccountJson: process.env.GOOGLE_SA_CLEMENT,
  },
};

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Fonction pour parser le Service Account JSON
function parseServiceAccount(raw) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const credentials = { ...parsed };
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    return credentials;
  } catch (error) {
    console.error('❌ Service Account JSON invalide:', error.message);
    return null;
  }
}

// Test de connexion pour un calendrier
async function testCalendarConnection(key, config) {
  console.log(`\n📅 Test du calendrier ${key}:`);
  
  if (!config.calendarId) {
    console.log(`❌ Calendar ID non défini pour ${key}`);
    return false;
  }
  
  if (!config.serviceAccountJson) {
    console.log(`❌ Service Account non défini pour ${key}`);
    return false;
  }
  
  const credentials = parseServiceAccount(config.serviceAccountJson);
  if (!credentials) {
    console.log(`❌ Service Account JSON invalide pour ${key}`);
    return false;
  }
  
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Test 1: Vérifier l'accès au calendrier
    console.log(`  🔍 Vérification de l'accès au calendrier...`);
    const calendarInfo = await calendar.calendars.get({
      calendarId: config.calendarId,
    });
    
    console.log(`  ✅ Accès au calendrier: ${calendarInfo.data.summary || 'Calendrier trouvé'}`);
    
    // Test 2: Lister les événements récents
    console.log(`  📋 Test de lecture des événements...`);
    const now = new Date();
    const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 jours en arrière
    const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 jours en avant
    
    const events = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    console.log(`  ✅ Lecture réussie: ${events.data.items?.length || 0} événements trouvés`);
    
    // Test 3: Créer un événement de test
    console.log(`  ✏️ Test de création d'événement...`);
    const testEvent = {
      summary: `TEST CALENDAR ${key.toUpperCase()} - ${new Date().toISOString()}`,
      description: 'Événement de test créé automatiquement',
      start: {
        dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // Dans 1 heure
        timeZone: 'Europe/Paris',
      },
      end: {
        dateTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // Dans 2 heures
        timeZone: 'Europe/Paris',
      },
    };
    
    const createdEvent = await calendar.events.insert({
      calendarId: config.calendarId,
      resource: testEvent,
    });
    
    console.log(`  ✅ Événement créé: ${createdEvent.data.id}`);
    
    // Test 4: Modifier l'événement
    console.log(`  🔄 Test de modification d'événement...`);
    const updatedEvent = await calendar.events.update({
      calendarId: config.calendarId,
      eventId: createdEvent.data.id,
      resource: {
        ...testEvent,
        summary: `TEST CALENDAR ${key.toUpperCase()} - MODIFIÉ`,
        description: 'Événement de test modifié automatiquement',
      },
    });
    
    console.log(`  ✅ Événement modifié: ${updatedEvent.data.id}`);
    
    // Test 5: Supprimer l'événement
    console.log(`  🗑️ Test de suppression d'événement...`);
    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId: createdEvent.data.id,
    });
    
    console.log(`  ✅ Événement supprimé`);
    
    return true;
  } catch (error) {
    console.log(`  ❌ Erreur pour ${key}:`, error.message);
    return false;
  }
}

// Test du fuseau horaire
async function testTimezone(key, config) {
  console.log(`\n🕐 Test du fuseau horaire pour ${key}:`);
  
  try {
    const credentials = parseServiceAccount(config.serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Vérifier le fuseau horaire du calendrier
    const calendarInfo = await calendar.calendars.get({
      calendarId: config.calendarId,
    });
    
    const timeZone = calendarInfo.data.timeZone;
    console.log(`  📍 Fuseau horaire du calendrier: ${timeZone}`);
    
    if (timeZone === 'Europe/Paris') {
      console.log(`  ✅ Fuseau horaire correct: Europe/Paris`);
    } else {
      console.log(`  ⚠️ Fuseau horaire différent: ${timeZone} (attendu: Europe/Paris)`);
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ Erreur de fuseau horaire pour ${key}:`, error.message);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests Google Calendar...');
  
  const results = {};
  
  for (const [key, config] of Object.entries(CALENDAR_CONFIGS)) {
    console.log(`\n🧪 Test du calendrier ${key.toUpperCase()}:`);
    console.log(`Calendar ID: ${config.calendarId || 'NON DÉFINI'}`);
    console.log(`Service Account: ${config.serviceAccountJson ? 'DÉFINI' : 'NON DÉFINI'}`);
    
    if (!config.calendarId || !config.serviceAccountJson) {
      console.log(`❌ Configuration incomplète pour ${key}`);
      results[key] = false;
      continue;
    }
    
    const connectionTest = await testCalendarConnection(key, config);
    const timezoneTest = await testTimezone(key, config);
    
    results[key] = connectionTest && timezoneTest;
  }
  
  console.log('\n🎯 RÉSULTATS FINAUX');
  console.log('==================');
  
  Object.entries(results).forEach(([key, success]) => {
    console.log(`${key}: ${success ? '✅' : '❌'}`);
  });
  
  const allTestsPassed = Object.values(results).every(result => result);
  
  if (allTestsPassed) {
    console.log('\n🎉 TOUS LES TESTS GOOGLE CALENDAR SONT PASSÉS !');
    console.log('✅ Google Calendar est pleinement opérationnel en production');
  } else {
    console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('🔧 Vérifiez la configuration Google Calendar');
  }
}

// Exécuter les tests
runAllTests().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
