// Script de test simple pour Vercel + Supabase
import { SupabaseService } from './supabase-simple'

export class VercelTest {
  /**
   * Test complet pour Vercel
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Test Vercel + Supabase...')
    
    try {
      // Test 1: Connexion
      console.log('🔌 Test de connexion...')
      const connected = await SupabaseService.testConnection()
      if (connected) {
        console.log('✅ Connexion Supabase réussie!')
      } else {
        console.log('❌ Connexion Supabase échouée')
        return
      }

      // Test 2: Création d'entreprise
      console.log('🏢 Test de création d\'entreprise...')
      const testCompany = {
        name: 'Test Company ' + Date.now(),
        address: '123 Test Street',
        city: 'Test City',
        postal_code: '12345',
        phone: '+33 1 23 45 67 89',
        email: 'test@example.com',
        siret: '12345678901234'
      }

      const company = await SupabaseService.createCompany(testCompany)
      console.log('✅ Entreprise créée:', company.id)

      // Test 3: Récupération des entreprises
      console.log('📊 Test de récupération des entreprises...')
      const companies = await SupabaseService.getCompanies()
      console.log(`✅ ${companies.length} entreprises trouvées`)

      // Test 4: Stockage
      console.log('📁 Test du stockage...')
      const storageOk = await SupabaseService.testStorage()
      if (storageOk) {
        console.log('✅ Stockage accessible')
      } else {
        console.log('⚠️ Stockage non accessible (normal si bucket non créé)')
      }

      console.log('🎉 Tous les tests sont passés!')
      
    } catch (error) {
      console.error('❌ Erreur lors des tests:', error)
    }
  }

  /**
   * Test de migration simple
   */
  static async migrateData(): Promise<void> {
    console.log('📊 Migration des données...')
    
    try {
      // Créer une entreprise par défaut
      const defaultCompany = {
        name: 'Wash&Go Fuveau',
        address: '123 Avenue de la République',
        city: 'Fuveau',
        postal_code: '13710',
        phone: '+33 4 42 12 34 56',
        email: 'contact@washandgo-fuveau.fr',
        siret: '12345678901234',
        vat_enabled: true,
        vat_rate: 20.00,
        is_default: true,
        bank_name: 'Crédit Agricole',
        bank_address: 'Avenue de la République, 13710 Fuveau',
        iban: 'FR76 1234 5678 9012 3456 7890 123',
        bic: 'AGRIFRPPXXX'
      }

      const company = await SupabaseService.createCompany(defaultCompany)
      console.log('✅ Entreprise par défaut créée:', company.id)

      // Créer un service de test
      const testService = {
        category: 'Voiture',
        name: 'Nettoyage intérieur complet',
        description: 'Aspiration, dégraissage et protection des surfaces intérieures.',
        base_price: 120,
        base_duration: 120,
        active: true
      }

      const service = await SupabaseService.createService(testService)
      console.log('✅ Service de test créé:', service.id)

      console.log('🎉 Migration terminée!')
      
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error)
    }
  }
}

// Exporter pour utilisation globale
if (typeof window !== 'undefined') {
  (window as any).VercelTest = VercelTest
}
