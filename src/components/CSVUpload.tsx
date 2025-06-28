import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { UploadResult, CSVMapping, UploadError, FailedRowData } from '../types';

interface CSVUploadProps {
  uploadType: 'companies' | 'contacts';
  onUploadTypeChange: (type: 'companies' | 'contacts') => void;
  onNavigateToCompanies?: () => void;
  onNavigateToContacts?: () => void;
}

type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

export default function CSVUpload({ uploadType, onUploadTypeChange, onNavigateToCompanies, onNavigateToContacts }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CSVMapping>({});
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const companyFields = [
    'company_name',
    'company_type',
    'industry',
    'website',
    'linkedin_url',
    'hq_location',
    'location_city',
    'location_state',
    'location_region',
    'size_range',
    'headcount',
    'revenue',
    'phone_number',
    'company_keywords',
    'industry_keywords',
    'technologies_used'
  ];

  const contactFields = [
    'name',
    'linkedin_url',
    'job_title',
    'company_name',
    'start_date',
    'email',
    'email_score',
    'phone_number',
    'location_city',
    'location_state',
    'location_region'
  ];

  const currentFields = uploadType === 'companies' ? companyFields : contactFields;
  const requiredFields = uploadType === 'companies'
    ? ['company_name']
    : ['name', 'job_title', 'company_name'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rawRows = text.split('\n').map(row =>
        row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      );

      const filteredRows = rawRows.filter((row, index) => {
        if (index === 0) return true;
        return row.some(cell => cell !== '' && cell !== '-');
      });

      setCsvData(filteredRows);
      setStep('preview');

      // Auto-map columns with better matching
      const headers = filteredRows[0];
      const autoMapping: CSVMapping = {};
      
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Exact matches first
        let matchedField = currentFields.find(field => field === normalizedHeader);
        
        // Partial matches if no exact match
        if (!matchedField) {
          matchedField = currentFields.find(field => {
            const fieldParts = field.split('_');
            const headerParts = normalizedHeader.split('_');
            return fieldParts.some(part => headerParts.includes(part)) ||
                   headerParts.some(part => fieldParts.includes(part));
          });
        }
        
        // Special cases for common variations
        if (!matchedField) {
          const specialMappings: Record<string, string> = {
            'full_name': 'name',
            'contact_name': 'name',
            'person_name': 'name',
            'first_name': 'name',
            'company': 'company_name',
            'organization': 'company_name',
            'employer': 'company_name',
            'title': 'job_title',
            'position': 'job_title',
            'role': 'job_title',
            'designation': 'job_title',
            'email_address': 'email',
            'mail': 'email',
            'phone': 'phone_number',
            'mobile': 'phone_number',
            'tel': 'phone_number',
            'city': 'location_city',
            'state': 'location_state',
            'region': 'location_region',
            'country': 'location_region',
            'linkedin': 'linkedin_url',
            'linkedin_profile': 'linkedin_url',
            'site': 'website',
            'url': 'website',
            'homepage': 'website',
            'start': 'start_date',
            'date': 'start_date',
            'joined': 'start_date'
          };
          
          matchedField = specialMappings[normalizedHeader];
        }
        
        if (matchedField && currentFields.includes(matchedField)) {
          autoMapping[matchedField] = index.toString();
        }
      });
      
      setMapping(autoMapping);
      console.log('Auto-mapped fields:', autoMapping);
    };
    reader.readAsText(file);
  };

  // Enhanced date parsing function
  const parseDate = (dateString: string): string | null => {
    if (!dateString || dateString.trim() === '' || dateString === '-') {
      return null;
    }

    const cleanDate = dateString.trim();
    
    try {
      // Handle MM YYYY format (e.g., "01 2024", "12 2023")
      const mmYyyyMatch = cleanDate.match(/^(\d{1,2})\s+(\d{4})$/);
      if (mmYyyyMatch) {
        const month = mmYyyyMatch[1].padStart(2, '0');
        const year = mmYyyyMatch[2];
        return `${year}-${month}-01`; // First day of the month
      }

      // Handle YYYY format (e.g., "2024", "2023")
      const yyyyMatch = cleanDate.match(/^(\d{4})$/);
      if (yyyyMatch) {
        const year = yyyyMatch[1];
        return `${year}-01-01`; // First day of the year
      }

      // Handle MM/YYYY format (e.g., "01/2024", "12/2023")
      const mmSlashYyyyMatch = cleanDate.match(/^(\d{1,2})\/(\d{4})$/);
      if (mmSlashYyyyMatch) {
        const month = mmSlashYyyyMatch[1].padStart(2, '0');
        const year = mmSlashYyyyMatch[2];
        return `${year}-${month}-01`;
      }

      // Handle MM-YYYY format (e.g., "01-2024", "12-2023")
      const mmDashYyyyMatch = cleanDate.match(/^(\d{1,2})-(\d{4})$/);
      if (mmDashYyyyMatch) {
        const month = mmDashYyyyMatch[1].padStart(2, '0');
        const year = mmDashYyyyMatch[2];
        return `${year}-${month}-01`;
      }

      // Handle standard date formats
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      // If all parsing fails, return null
      console.warn(`Could not parse date: "${dateString}"`);
      return null;
    } catch (error) {
      console.warn(`Error parsing date "${dateString}":`, error);
      return null;
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setStep('mapping');

    try {
      const errors: UploadError[] = [];
      const failedRowsData: FailedRowData[] = [];
      const dataRows = csvData.slice(1);
      let successfulCount = 0;

      console.log('Starting upload process...');
      console.log('Data rows to process:', dataRows.length);
      console.log('Upload type:', uploadType);
      console.log('Field mapping:', mapping);

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowErrors: UploadError[] = [];
        
        console.log(`Processing row ${i + 1}:`, row);
        
        // Validate required fields
        for (const field of requiredFields) {
          const columnIndex = mapping[field] ? parseInt(mapping[field], 10) : -1;
          const cellValue = columnIndex !== -1 && row[columnIndex] !== undefined ? row[columnIndex] : '';
          
          console.log(`Checking required field ${field}: columnIndex=${columnIndex}, value="${cellValue}"`);
          
          if (!cellValue || cellValue.trim() === '' || cellValue === '-') {
            rowErrors.push({
              row: i + 1,
              field: field,
              value: cellValue,
              error: 'Required field is empty'
            });
          }
        }

        // If there are validation errors, add to failed rows
        if (rowErrors.length > 0) {
          failedRowsData.push({
            row_index: i,
            original_data: row,
            errors: rowErrors
          });
          errors.push(...rowErrors);
          console.log(`Row ${i + 1} failed validation:`, rowErrors);
          continue;
        }

        // Process successful row
        try {
          if (uploadType === 'companies') {
            const companyData: CompanyInsert = {
              company_name: getFieldValue(row, 'company_name') || '',
              company_type: getFieldValue(row, 'company_type') || 'Private',
              industry: getFieldValue(row, 'industry') || 'Technology',
              website: getFieldValue(row, 'website') || null,
              linkedin_url: getFieldValue(row, 'linkedin_url') || null,
              hq_location: getFieldValue(row, 'hq_location') || getFieldValue(row, 'location_city') || '',
              location_city: getFieldValue(row, 'location_city') || '',
              location_state: getFieldValue(row, 'location_state') || '',
              location_region: getFieldValue(row, 'location_region') || 'North America',
              size_range: getFieldValue(row, 'size_range') || '1-50',
              headcount: parseNumber(getFieldValue(row, 'headcount')),
              revenue: getFieldValue(row, 'revenue') || null,
              phone_number: getFieldValue(row, 'phone_number') || null,
              company_keywords: parseArray(getFieldValue(row, 'company_keywords')),
              industry_keywords: parseArray(getFieldValue(row, 'industry_keywords')),
              technologies_used: parseArray(getFieldValue(row, 'technologies_used')),
              visible_to_tiers: ['free', 'pro', 'enterprise'] // Make visible to all tiers
            };

            console.log('Inserting company data:', companyData);

            const { data, error } = await supabase
              .from('companies')
              .insert(companyData)
              .select();

            if (error) {
              console.error('Company insert error:', error);
              rowErrors.push({
                row: i + 1,
                field: 'database',
                value: '',
                error: `Database error: ${error.message}`
              });
              failedRowsData.push({
                row_index: i,
                original_data: row,
                errors: rowErrors
              });
              errors.push(...rowErrors);
            } else {
              console.log('Company inserted successfully:', data);
              successfulCount++;
            }

          } else {
            // For contacts, we need to find or create the company first
            const companyName = getFieldValue(row, 'company_name');
            let companyId: string | null = null;

            console.log('Processing contact with company name:', companyName);

            if (companyName && companyName.trim() !== '' && companyName !== '-') {
              // Try to find existing company
              const { data: existingCompany } = await supabase
                .from('companies')
                .select('company_id')
                .eq('company_name', companyName)
                .single();

              if (existingCompany) {
                companyId = existingCompany.company_id;
                console.log('Found existing company:', companyId);
              } else {
                // Create new company
                console.log('Creating new company:', companyName);
                const { data: newCompany, error: companyError } = await supabase
                  .from('companies')
                  .insert({
                    company_name: companyName,
                    company_type: 'Private',
                    industry: 'Technology',
                    hq_location: getFieldValue(row, 'location_city') || '',
                    location_city: getFieldValue(row, 'location_city') || '',
                    location_state: getFieldValue(row, 'location_state') || '',
                    location_region: getFieldValue(row, 'location_region') || 'North America',
                    size_range: '1-50',
                    visible_to_tiers: ['free', 'pro', 'enterprise']
                  })
                  .select('company_id')
                  .single();

                if (newCompany && !companyError) {
                  companyId = newCompany.company_id;
                  console.log('Created new company:', companyId);
                } else {
                  console.error('Error creating company:', companyError);
                }
              }
            }

            if (companyId) {
              // Parse the start_date with enhanced date parsing
              const startDateValue = getFieldValue(row, 'start_date');
              const parsedStartDate = parseDate(startDateValue);
              
              console.log(`Parsing start_date: "${startDateValue}" -> "${parsedStartDate}"`);

              const contactData: ContactInsert = {
                name: getFieldValue(row, 'name') || '',
                linkedin_url: getFieldValue(row, 'linkedin_url') || null,
                job_title: getFieldValue(row, 'job_title') || '',
                company_id: companyId,
                start_date: parsedStartDate,
                email: getFieldValue(row, 'email') || null,
                email_score: parseNumber(getFieldValue(row, 'email_score')),
                phone_number: getFieldValue(row, 'phone_number') || null,
                location_city: getFieldValue(row, 'location_city') || '',
                location_state: getFieldValue(row, 'location_state') || '',
                location_region: getFieldValue(row, 'location_region') || 'North America',
                visible_to_tiers: ['free', 'pro', 'enterprise'] // Make visible to all tiers
              };

              console.log('Inserting contact data:', contactData);

              const { data, error } = await supabase
                .from('contacts')
                .insert(contactData)
                .select();

              if (error) {
                console.error('Contact insert error:', error);
                rowErrors.push({
                  row: i + 1,
                  field: 'database',
                  value: '',
                  error: `Database error: ${error.message}`
                });
                failedRowsData.push({
                  row_index: i,
                  original_data: row,
                  errors: rowErrors
                });
                errors.push(...rowErrors);
              } else {
                console.log('Contact inserted successfully:', data);
                successfulCount++;
              }
            } else {
              rowErrors.push({
                row: i + 1,
                field: 'company_name',
                value: companyName,
                error: 'Could not find or create company'
              });
              failedRowsData.push({
                row_index: i,
                original_data: row,
                errors: rowErrors
              });
              errors.push(...rowErrors);
            }
          }
        } catch (error) {
          console.error('Row processing error:', error);
          rowErrors.push({
            row: i + 1,
            field: 'processing',
            value: '',
            error: `Processing error: ${error}`
          });
          failedRowsData.push({
            row_index: i,
            original_data: row,
            errors: rowErrors
          });
          errors.push(...rowErrors);
        }
      }

      const result: UploadResult = {
        total_rows: dataRows.length,
        added: successfulCount,
        updated: 0,
        failed: failedRowsData.length,
        errors: errors,
        failed_rows_data: failedRowsData,
        processing_time: 2.8
      };

      console.log('Upload result:', result);
      setUploadResult(result);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setStep('complete');
    }
  };

  const getFieldValue = (row: string[], fieldName: string): string => {
    const columnIndex = mapping[fieldName] ? parseInt(mapping[fieldName], 10) : -1;
    const value = columnIndex !== -1 && row[columnIndex] !== undefined ? row[columnIndex].trim() : '';
    return value === '-' ? '' : value;
  };

  const parseNumber = (value: string): number | null => {
    if (!value || value.trim() === '' || value === '-') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const parseArray = (value: string): string[] => {
    if (!value || value.trim() === '' || value === '-') return [];
    return value.split(';').map(item => item.trim()).filter(item => item && item !== '-');
  };

  const downloadTemplate = () => {
    const headers = currentFields.join(',');
    const sampleRow = uploadType === 'companies' 
      ? 'TechCorp Inc.,Private,Software,https://techcorp.com,https://linkedin.com/company/techcorp,San Francisco CA,San Francisco,CA,North America,201-500,350,$50M-$100M,+1-555-123-4567,SaaS;B2B,Software;Technology,React;Node.js'
      : 'John Doe,https://linkedin.com/in/johndoe,Software Engineer,TechCorp Inc.,01 2024,john.doe@techcorp.com,95,+1-555-123-4567,San Francisco,CA,North America';
    
    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${uploadType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setFile(null);
    setCsvData([]);
    setMapping({});
    setUploadResult(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewUploadedData = () => {
    if (uploadType === 'companies' && onNavigateToCompanies) {
      onNavigateToCompanies();
    } else if (uploadType === 'contacts' && onNavigateToContacts) {
      onNavigateToContacts();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Upload Type Selector */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => onUploadTypeChange('companies')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              uploadType === 'companies'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Company Data
          </button>
          <button
            onClick={() => onUploadTypeChange('contacts')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              uploadType === 'contacts'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Contact Data
          </button>
        </div>
      </div>

      {/* Date Format Info */}
      {uploadType === 'contacts' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">📅 Date Format Guidelines</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Supported start_date formats:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>MM YYYY</code> - e.g., "01 2024", "12 2023" (shows as MM YYYY)</li>
              <li><code>YYYY</code> - e.g., "2024", "2023" (shows as YYYY only)</li>
              <li><code>MM/YYYY</code> - e.g., "01/2024", "12/2023"</li>
              <li><code>MM-YYYY</code> - e.g., "01-2024", "12-2023"</li>
              <li>Standard dates - e.g., "2024-01-15", "01/15/2024"</li>
            </ul>
          </div>
        </div>
      )}

      {/* Upload Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['upload', 'preview', 'mapping', 'complete'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName
                    ? 'bg-blue-600 text-white'
                    : index < ['upload', 'preview', 'mapping', 'complete'].indexOf(step)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              {index < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    index < ['upload', 'preview', 'mapping', 'complete'].indexOf(step)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Upload File</span>
          <span>Preview Data</span>
          <span>Processing</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload {uploadType === 'companies' ? 'Company' : 'Contact'} Data
            </h3>
            <p className="text-gray-600 mb-6">
              Select a CSV file containing your {uploadType} data. Make sure it includes all required fields.
            </p>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Click to upload CSV</span>
                  <span className="text-xs text-gray-500">or drag and drop</span>
                </label>
              </div>

              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && csvData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Preview Data & Field Mapping</h3>
            <span className="text-sm text-gray-600">{csvData.length > 0 ? csvData.length - 1 : 0} rows detected</span>
          </div>

          {/* Field Mapping Section */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3">Field Mapping</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentFields.map((field) => (
                <div key={field} className="flex items-center space-x-2">
                  <label className="text-xs font-medium text-gray-700 w-24 capitalize">
                    {field.replace('_', ' ')}
                    {requiredFields.includes(field) && <span className="text-red-500">*</span>}:
                  </label>
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="">-- Select Column --</option>
                    {csvData[0]?.map((header, index) => (
                      <option key={index} value={index.toString()}>
                        {header} (Column {index + 1})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {csvData[0]?.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {csvData.slice(1, Math.min(4, csvData.length)).map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button
              onClick={resetUpload}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Choose Different File
            </button>
            <button
              onClick={handleUpload}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Process Upload
            </button>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Upload</h3>
            <p className="text-gray-600">
              Validating data and importing {csvData.length > 0 ? csvData.length - 1 : 0} records...
            </p>
          </div>
        </div>
      )}

      {step === 'complete' && uploadResult && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${uploadResult.failed === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
              {uploadResult.failed === 0 ? (
                 <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                 <AlertCircle className="w-8 h-8 text-yellow-600" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Complete</h3>
            <p className="text-gray-600">
              Processed {uploadResult.total_rows} rows in {uploadResult.processing_time}s
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">Added</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-1">{uploadResult.added}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Updated</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">{uploadResult.updated}</p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-800">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-900 mt-1">{uploadResult.failed}</p>
            </div>
          </div>

          {uploadResult.failed_rows_data.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Failed Rows ({uploadResult.failed} rows)</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 overflow-x-auto">
                 <table className="min-w-full divide-y divide-red-200">
                    <thead className="bg-red-100">
                       <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Row #</th>
                          {csvData[0]?.map((header, index) => (
                             <th
                                key={index}
                                className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase tracking-wider"
                             >
                                {header}
                             </th>
                          ))}
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Errors</th>
                       </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-red-200">
                       {uploadResult.failed_rows_data.map((failedRow, index) => (
                          <tr key={index}>
                             <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-red-900">
                                {failedRow.row_index + 1}
                             </td>
                             {failedRow.original_data.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                   {cell || '-'}
                                </td>
                             ))}
                             <td className="px-4 py-2 text-sm text-red-700">
                                <ul>
                                   {failedRow.errors.map((error, errorIndex) => (
                                      <li key={errorIndex}>
                                         <strong>{error.field}:</strong> {error.error}
                                      </li>
                                   ))}
                                </ul>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <button
              onClick={resetUpload}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Upload Another File
            </button>
            
            {uploadResult.added > 0 && (
              <button
                onClick={handleViewUploadedData}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                View Uploaded {uploadType === 'companies' ? 'Companies' : 'Contacts'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}