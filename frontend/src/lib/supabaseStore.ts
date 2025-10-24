import { supabaseClient } from './supabase'
import type { Database } from './supabase'

// Types simplifiés pour l'interface
export type Company = Database['public']['Tables']['companies']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientContact = Database['public']['Tables']['client_contacts']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type ServiceOption = Database['public']['Tables']['service_options']['Row']
export type Engagement = Database['public']['Tables']['engagements']['Row']
export type AuthUser = Database['public']['Tables']['auth_users']['Row']
export type Document = Database['public']['Tables']['documents']['Row']

// Types simplifiés pour le déploiement
export type CompanyInsert = any
export type ClientInsert = any
export type ClientContactInsert = any
export type ServiceInsert = any
export type ServiceOptionInsert = any
export type EngagementInsert = any
export type AuthUserInsert = any
export type DocumentInsert = any

// Types pour les mises à jour
export type CompanyUpdate = any
export type ClientUpdate = any
export type ClientContactUpdate = any
export type ServiceUpdate = any
export type ServiceOptionUpdate = any
export type EngagementUpdate = any
export type AuthUserUpdate = any
export type DocumentUpdate = any

// Fonctions de base pour interagir avec Supabase
export class SupabaseService {
  // === COMPANIES ===
  static async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabaseClient
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  static async createCompany(company: CompanyInsert): Promise<Company> {
    const { data, error } = await supabaseClient
      .from('companies')
      .insert(company)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
    const { data, error } = await supabaseClient
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteCompany(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('companies')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // === CLIENTS ===
  static async getClients(): Promise<Client[]> {
    const { data, error } = await supabaseClient
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  static async createClient(client: ClientInsert): Promise<Client> {
    const { data, error } = await supabaseClient
      .from('clients')
      .insert(client)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateClient(id: string, updates: ClientUpdate): Promise<Client> {
    const { data, error } = await supabaseClient
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteClient(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('clients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // === CLIENT CONTACTS ===
  static async getClientContacts(clientId: string): Promise<ClientContact[]> {
    const { data, error } = await supabaseClient
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async createClientContact(contact: ClientContactInsert): Promise<ClientContact> {
    const { data, error } = await supabaseClient
      .from('client_contacts')
      .insert(contact)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateClientContact(id: string, updates: ClientContactUpdate): Promise<ClientContact> {
    const { data, error } = await supabaseClient
      .from('client_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteClientContact(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('client_contacts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // === SERVICES ===
  static async getServices(): Promise<Service[]> {
    const { data, error } = await supabaseClient
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async getService(id: string): Promise<Service | null> {
    const { data, error } = await supabaseClient
      .from('services')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  static async createService(service: ServiceInsert): Promise<Service> {
    const { data, error } = await supabaseClient
      .from('services')
      .insert(service)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateService(id: string, updates: ServiceUpdate): Promise<Service> {
    const { data, error } = await supabaseClient
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteService(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('services')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // === SERVICE OPTIONS ===
  static async getServiceOptions(serviceId: string): Promise<ServiceOption[]> {
    const { data, error } = await supabaseClient
      .from('service_options')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async createServiceOption(option: ServiceOptionInsert): Promise<ServiceOption> {
    const { data, error } = await supabaseClient
      .from('service_options')
      .insert(option)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateServiceOption(id: string, updates: ServiceOptionUpdate): Promise<ServiceOption> {
    const { data, error } = await supabaseClient
      .from('service_options')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteServiceOption(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('service_options')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // === ENGAGEMENTS ===
  static async getEngagements(): Promise<Engagement[]> {
    const { data, error } = await supabaseClient
      .from('engagements')
      .select('*')
      .order('scheduled_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async getEngagement(id: string): Promise<Engagement | null> {
    const { data, error } = await supabaseClient
      .from('engagements')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  static async createEngagement(engagement: EngagementInsert): Promise<Engagement> {
    const { data, error } = await supabaseClient
      .from('engagements')
      .insert(engagement)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateEngagement(id: string, updates: EngagementUpdate): Promise<Engagement> {
    const { data, error } = await supabaseClient
      .from('engagements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteEngagement(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('engagements')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // === AUTH USERS ===
  static async getAuthUsers(): Promise<AuthUser[]> {
    const { data, error } = await supabaseClient
      .from('auth_users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async getAuthUser(id: string): Promise<AuthUser | null> {
    const { data, error } = await supabaseClient
      .from('auth_users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  static async createAuthUser(user: AuthUserInsert): Promise<AuthUser> {
    const { data, error } = await supabaseClient
      .from('auth_users')
      .insert(user)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async updateAuthUser(id: string, updates: AuthUserUpdate): Promise<AuthUser> {
    const { data, error } = await supabaseClient
      .from('auth_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteAuthUser(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('auth_users')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // === DOCUMENTS ===
  static async getDocuments(engagementId: string): Promise<Document[]> {
    const { data, error } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  static async createDocument(document: DocumentInsert): Promise<Document> {
    const { data, error } = await supabaseClient
      .from('documents')
      .insert(document)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async deleteDocument(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from('documents')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
