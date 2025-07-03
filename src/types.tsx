export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'subscriber';
  subscription_tier: 'free' | 'pro' | 'enterprise';
  credits_remaining: number;
  credits_monthly_limit: number;
  subscription_status: 'active' | 'canceled' | 'past_due';
  created_at: Date;
  last_login: Date;
  billing_cycle_start: Date;
  billing_cycle_end: Date;
  exports_this_month: {
    companies: number;
    contacts: number;
  };
  company_name: string;
  // New fields from updated profiles table
  username: string;
  phone: string;
  email_verified: boolean;
  phone_verified: boolean;
}

// New types for CSV Upload
export interface UploadError {
  row: number; // 1-based index from the CSV file
  field: string; // The field name that failed validation/processing
  value: any; // The value that caused the error
  error: string; // Description of the error
}

export interface FailedRowData {
  row_index: number; // 0-based index from the parsed csvData array (excluding header)
  original_data: string[]; // The array of strings representing the row's original data
  errors: UploadError[]; // Specific errors for this row
}

export interface UploadResult {
  total_rows: number; // Total data rows processed (excluding header)
  added: number;
  updated: number;
  failed: number;
  errors: UploadError[]; // List of all errors across all failed rows
  failed_rows_data: FailedRowData[]; // Data for rows that failed processing
  processing_time: number;
}

export interface CSVMapping {
  [key: string]: string; // Maps field names to column indices
}

export interface ExportHistory {
  id: string;
  user_id: string;
  type: 'companies' | 'contacts';
  count: number;
  filename: string;
  exported_at: Date;
  filters_applied?: string;
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