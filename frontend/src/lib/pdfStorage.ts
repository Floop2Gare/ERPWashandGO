import { supabaseClient } from './supabase'
import { generateInvoicePdf, generateQuotePdf } from './invoice'
import type { Engagement, Company, Client, Service } from './supabaseStore'

// Types simplifiés pour le déploiement
type SimpleEngagement = any
type SimpleCompany = any
type SimpleClient = any
type SimpleService = any

export interface PdfGenerationOptions {
  engagement: Engagement
  company: Company
  client: Client
  service: Service
  serviceOptions?: any[]
}

export class PdfStorageService {
  /**
   * Génère et stocke un PDF de facture
   */
  static async generateAndStoreInvoice(options: PdfGenerationOptions): Promise<string> {
    try {
      // Générer le PDF
      const pdfBlob = await generateInvoicePdf({
        documentNumber: options.engagement.invoice_number || `INV-${options.engagement.id}`,
        issueDate: new Date(),
        serviceDate: new Date(options.engagement.service_date),
        company: options.company,
        client: options.client,
        service: options.service,
        options: options.serviceOptions || [],
        additionalCharge: 0,
        vatRate: 20,
        vatEnabled: true,
        status: options.engagement.status,
        supportType: options.engagement.support_type,
        supportDetail: options.engagement.support_detail || '',
        paymentMethod: options.engagement.payment_method
      })

      // Créer un nom de fichier unique
      const fileName = `invoice-${options.engagement.invoice_number || options.engagement.id}-${Date.now()}.pdf`
      const filePath = `invoices/${fileName}`

      // Uploader vers Supabase Storage
      const { data, error } = await supabaseClient.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (error) throw error

      // Obtenir l'URL publique
      const { data: urlData } = supabaseClient.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Enregistrer dans la table documents
      const { data: documentData, error: docError } = await supabaseClient
        .from('documents')
        .insert({
          engagement_id: options.engagement.id,
          type: 'invoice',
          file_path: filePath,
          file_url: urlData.publicUrl
        } as any)
        .select()
        .single()

      if (docError) throw docError

      return urlData.publicUrl
    } catch (error) {
      console.error('Erreur lors de la génération/storage de la facture:', error)
      throw error
    }
  }

  /**
   * Génère et stocke un PDF de devis
   */
  static async generateAndStoreQuote(options: PdfGenerationOptions): Promise<string> {
    try {
      // Générer le PDF
      const pdfBlob = await generateQuotePdf({
        documentNumber: options.engagement.quote_number || `QUO-${options.engagement.id}`,
        issueDate: new Date(),
        serviceDate: new Date(options.engagement.service_date),
        company: options.company,
        client: options.client,
        service: options.service,
        options: options.serviceOptions || [],
        additionalCharge: 0,
        vatRate: 20,
        vatEnabled: true,
        status: options.engagement.status,
        supportType: options.engagement.support_type,
        supportDetail: options.engagement.support_detail || '',
        validityNote: options.engagement.validity_note
      })

      // Créer un nom de fichier unique
      const fileName = `quote-${options.engagement.quote_number || options.engagement.id}-${Date.now()}.pdf`
      const filePath = `quotes/${fileName}`

      // Uploader vers Supabase Storage
      const { data, error } = await supabaseClient.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (error) throw error

      // Obtenir l'URL publique
      const { data: urlData } = supabaseClient.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Enregistrer dans la table documents
      const { data: documentData, error: docError } = await supabaseClient
        .from('documents')
        .insert({
          engagement_id: options.engagement.id,
          type: 'quote',
          file_path: filePath,
          file_url: urlData.publicUrl
        } as any)
        .select()
        .single()

      if (docError) throw docError

      return urlData.publicUrl
    } catch (error) {
      console.error('Erreur lors de la génération/storage du devis:', error)
      throw error
    }
  }

  /**
   * Récupère l'URL d'un document
   */
  static async getDocumentUrl(engagementId: string, type: 'invoice' | 'quote'): Promise<string | null> {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('file_url')
        .eq('engagement_id', engagementId)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) return null
      return (data as any)?.file_url || null
    } catch (error) {
      console.error('Erreur lors de la récupération du document:', error)
      return null
    }
  }

  /**
   * Supprime un document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // Récupérer les infos du document
      const { data: document, error: fetchError } = await supabaseClient
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single()

      if (fetchError) throw fetchError

      // Supprimer le fichier du storage
      if ((document as any)?.file_path) {
        const { error: storageError } = await supabaseClient.storage
          .from('documents')
          .remove([(document as any).file_path])

        if (storageError) console.warn('Erreur lors de la suppression du fichier:', storageError)
      }

      // Supprimer l'enregistrement de la base
      const { error: deleteError } = await supabaseClient
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (deleteError) throw deleteError
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error)
      throw error
    }
  }

  /**
   * Liste tous les documents d'un engagement
   */
  static async getEngagementDocuments(engagementId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error)
      return []
    }
  }
}
