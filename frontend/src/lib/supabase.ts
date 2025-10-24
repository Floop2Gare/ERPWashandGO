import { createClient } from '@supabase/supabase-js'

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types simplifiés pour le déploiement
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: any
        Insert: any
        Update: any
      }
      clients: {
        Row: any
        Insert: any
        Update: any
      }
      client_contacts: {
        Row: any
        Insert: any
        Update: any
      }
      services: {
        Row: any
        Insert: any
        Update: any
      }
      service_options: {
        Row: any
        Insert: any
        Update: any
      }
      engagements: {
        Row: any
        Insert: any
        Update: any
      }
      auth_users: {
        Row: any
        Insert: any
        Update: any
      }
      documents: {
        Row: any
        Insert: any
        Update: any
      }
    }
  }
}

// Client Supabase typé
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
