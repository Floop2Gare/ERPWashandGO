// Script de test pour vérifier les variables d'environnement en production
console.log('🔍 TEST DES VARIABLES D\'ENVIRONNEMENT EN PRODUCTION');
console.log('==================================================');

// Test des variables Supabase
console.log('\n📊 Variables Supabase:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || 'NON DÉFINIE');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'DÉFINIE' : 'NON DÉFINIE');

// Test des variables Google Calendar
console.log('\n📅 Variables Google Calendar:');
console.log('GOOGLE_SA_ADRIEN:', process.env.GOOGLE_SA_ADRIEN ? 'DÉFINIE' : 'NON DÉFINIE');
console.log('GOOGLE_SA_CLEMENT:', process.env.GOOGLE_SA_CLEMENT ? 'DÉFINIE' : 'NON DÉFINIE');
console.log('GOOGLE_CALENDAR_ID_ADRIEN:', process.env.GOOGLE_CALENDAR_ID_ADRIEN || 'NON DÉFINIE');
console.log('GOOGLE_CALENDAR_ID_CLEMENT:', process.env.GOOGLE_CALENDAR_ID_CLEMENT || 'NON DÉFINIE');

// Test de la configuration des calendriers
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

console.log('\n🔧 Configuration des calendriers:');
Object.entries(CALENDAR_CONFIGS).forEach(([key, config]) => {
  console.log(`${key}:`);
  console.log(`  - Calendar ID: ${config.calendarId ? '✅ DÉFINI' : '❌ MANQUANT'}`);
  console.log(`  - Service Account: ${config.serviceAccountJson ? '✅ DÉFINI' : '❌ MANQUANT'}`);
});

// Test de parsing du Service Account JSON
console.log('\n🧪 Test de parsing des Service Accounts:');
Object.entries(CALENDAR_CONFIGS).forEach(([key, config]) => {
  if (config.serviceAccountJson) {
    try {
      const parsed = JSON.parse(config.serviceAccountJson);
      console.log(`${key}: ✅ JSON valide - Type: ${parsed.type || 'N/A'}`);
    } catch (error) {
      console.log(`${key}: ❌ JSON invalide - ${error.message}`);
    }
  } else {
    console.log(`${key}: ❌ Service Account non défini`);
  }
});

console.log('\n✨ Test terminé');
