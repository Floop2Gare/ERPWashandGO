import { createClient } from '@supabase/supabase-js'

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service simplifié pour le déploiement
export class SupabaseService {
  // Test de connexion
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('companies').select('count').limit(1)
      return !error
    } catch (error) {
      return false
    }
  }

  // Créer une entreprise
  static async createCompany(company: any): Promise<any> {
    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Récupérer les entreprises
  static async getCompanies(): Promise<any[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // Créer un client
  static async createClient(client: any): Promise<any> {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Récupérer les clients
  static async getClients(): Promise<any[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // Créer un service
  static async createService(service: any): Promise<any> {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Récupérer les services
  static async getServices(): Promise<any[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // Créer un engagement
  static async createEngagement(engagement: any): Promise<any> {
    const { data, error } = await supabase
      .from('engagements')
      .insert(engagement)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Récupérer les engagements
  static async getEngagements(): Promise<any[]> {
    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .order('scheduled_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  // Test du stockage
  static async testStorage(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.from('documents').list()
      return !error
    } catch (error) {
      return false
    }
  }
}
