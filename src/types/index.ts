export interface Company {
  company_id: string;
  company_name: string;
  company_type: 'Public' | 'Private' | 'NGO' | 'Government' | 'Startup';
  industry: string;
  website?: string;
  linkedin_url?: string;
  hq_location: string;
  location_city: string;
  location_state: string;
  location_region: string;
  size_range: string;
  headcount?: number;
  revenue?: string;
  phone_number?: string;
  company_keywords: string[];
  industry_keywords: string[];
  technologies_used: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Contact {
  contact_id: string;
  name: string;
  linkedin_url?: string;
  job_title: string;
  company_id: string;
  start_date?: Date;
  email?: string;
  email_score?: number;
  phone_number?: string;
  location_city: string;
  location_state: string;
  location_region: string;
  created_at: Date;
  updated_at: Date;
  company?: Company;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'subscriber' | 'viewer';
  subscription_tier: 'free' | 'starter' | 'pro' | 'enterprise';
  credits_remaining: number;
  credits_monthly_limit: number;
  subscription_status: 'active' | 'cancelled' | 'past_due';
  created_at: Date;
  last_login: Date;
}

export interface SavedList {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  contact_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface SavedListItem {
  id: string;
  list_id: string;
  contact_id: string;
  notes?: string;
  added_at: Date;
}

export interface UploadResult {
  total_rows: number;
  added: number;
  updated: number;
  failed: number;
  errors: UploadError[];
  processing_time: number;
}

export interface UploadError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export interface CSVMapping {
  [key: string]: string;
}

export interface SearchFilters {
  query?: string;
  industry?: string;
  location?: string;
  company_size?: string;
  job_title?: string;
  company_type?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits_per_month: number;
  features: string[];
  popular?: boolean;
}
