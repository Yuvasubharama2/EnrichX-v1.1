export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          company_id: string
          company_name: string
          company_type: string
          industry: string
          website: string | null
          linkedin_url: string | null
          hq_location: string
          location_city: string
          location_state: string
          location_region: string
          size_range: string
          headcount: number | null
          revenue: string | null
          phone_number: string | null
          company_keywords: string[]
          industry_keywords: string[]
          technologies_used: string[]
          visible_to_tiers: SubscriptionTier[]
          created_at: string
          updated_at: string
        }
        Insert: {
          company_id?: string
          company_name: string
          company_type: string
          industry: string
          website?: string | null
          linkedin_url?: string | null
          hq_location: string
          location_city: string
          location_state: string
          location_region: string
          size_range: string
          headcount?: number | null
          revenue?: string | null
          phone_number?: string | null
          company_keywords?: string[]
          industry_keywords?: string[]
          technologies_used?: string[]
          visible_to_tiers?: SubscriptionTier[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          company_type?: string
          industry?: string
          website?: string | null
          linkedin_url?: string | null
          hq_location?: string
          location_city?: string
          location_state?: string
          location_region?: string
          size_range?: string
          headcount?: number | null
          revenue?: string | null
          phone_number?: string | null
          company_keywords?: string[]
          industry_keywords?: string[]
          technologies_used?: string[]
          visible_to_tiers?: SubscriptionTier[]
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          contact_id: string
          name: string
          linkedin_url: string | null
          job_title: string
          company_id: string
          start_date: string | null
          email: string | null
          email_score: number | null
          phone_number: string | null
          location_city: string
          location_state: string
          location_region: string
          company_website: string | null
          department: string | null
          visible_to_tiers: SubscriptionTier[]
          created_at: string
          updated_at: string
        }
        Insert: {
          contact_id?: string
          name: string
          linkedin_url?: string | null
          job_title: string
          company_id: string
          start_date?: string | null
          email?: string | null
          email_score?: number | null
          phone_number?: string | null
          location_city: string
          location_state: string
          location_region: string
          company_website?: string | null
          department?: string | null
          visible_to_tiers?: SubscriptionTier[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          name?: string
          linkedin_url?: string | null
          job_title?: string
          company_id?: string
          start_date?: string | null
          email?: string | null
          email_score?: number | null
          phone_number?: string | null
          location_city?: string
          location_state?: string
          location_region?: string
          company_website?: string | null
          department?: string | null
          visible_to_tiers?: SubscriptionTier[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_tier: SubscriptionTier
    }
  }
}