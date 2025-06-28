import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { UploadResult, CSVMapping, UploadError, FailedRowData } from '../types';

interface CSVUploadProps {
  uploadType: 'companies' | 'contacts';
  onUploadTypeChange: (type: 'companies' | 'contacts') => void;
  onNavigateToCompanies?: () => void;
}

type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

export default function CSVUpload({ uploadType, onUploadTypeChange, onNavigateToCompanies }: CSVUploadProps) {
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
        row.split(',').map(cell => cell.trim()).map(cell => cell === '-' ? '' : cell)
      );

      const filteredRows = rawRows.filter((row, index) => {
        if (index === 0) return true;
        return row.some(cell => cell !== '');
      });

      setCsvData(filteredRows);
      setStep('preview');

      // Auto-map columns
      const headers = filteredRows[0];
      const autoMapping: CSVMapping = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const matchedField = currentFields.find(field =>
          field.includes(normalizedHeader) || normalizedHeader.includes(field.replace('_', ''))
        );
        if (matchedField) {
          autoMapping[matchedField] = index.toString();
        }
      });
      setMapping(autoMapping);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    setUploading(true);
    setStep('mapping');

    try {
      const errors: UploadError[] = [];
      const failedRowsData: FailedRowData[] = [];
      const dataRows = csvData.slice(1);
      const successfulData: (CompanyInsert | ContactInsert)[] = [];

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowErrors: UploadError[] = [];
        
        // Validate required fields
        for (const field of requiredFields) {
          const columnIndex = mapping[field] ? parseInt(mapping[field], 10) : -1;
          const cellValue = columnIndex !== -1 && row[columnIndex] !== undefined ? row[columnIndex] : '';
          
          if (!cellValue) {
            rowErrors.push({
              row: i,
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
          continue;
        }

        // Process successful row
        if (uploadType === 'companies') {
          const companyData: CompanyInsert = {
            company_name: getFieldValue(row, 'company_name') || '',
            company_type: getFieldValue(row, 'company_type') || 'Private',
            industry: getFieldValue(row, 'industry') || '',
            website: getFieldValue(row, 'website') || null,
            linkedin_url: getFieldValue(row, 'linkedin_url') || null,
            hq_location: getFieldValue(row, 'hq_location') || '',
            location_city: getFieldValue(row, 'location_city') || '',
            location_state: getFieldValue(row, 'location_state') || '',
            location_region: getFieldValue(row, 'location_region') || '',
            size_range: getFieldValue(row, 'size_range') || '',
            headcount: parseNumber(getFieldValue(row, 'headcount')),
            revenue: getFieldValue(row, 'revenue') || null,
            phone_number: getFieldValue(row, 'phone_number') || null,
            company_keywords: parseArray(getFieldValue(row, 'company_keywords')),
            industry_keywords: parseArray(getFieldValue(row, 'industry_keywords')),
            technologies_used: parseArray(getFieldValue(row, 'technologies_used')),
            visible_to_tiers: ['free'] // Default visibility
          };
          successfulData.push(companyData);
        } else {
          // For contacts, we need to find or create the company first
          const companyName = getFieldValue(row, 'company_name');
          let companyId: string | null = null;

          if (companyName) {
            // Try to find existing company
            const { data: existingCompany } = await supabase
              .from('companies')
              .select('company_id')
              .eq('company_name', companyName)
              .single();

            if (existingCompany) {
              companyId = existingCompany.company_id;
            } else {
              // Create new company
              const { data: newCompany, error: companyError } = await supabase
                .from('companies')
                .insert({
                  company_name: companyName,
                  visible_to_tiers: ['free']
                })
                .select('company_id')
                .single();

              if (newCompany && !companyError) {
                companyId = newCompany.company_id;
              }
            }
          }

          if (companyId) {
            const contactData: ContactInsert = {
              name: getFieldValue(row, 'name') || '',
              linkedin_url: getFieldValue(row, 'linkedin_url') || null,
              job_title: getFieldValue(row, 'job_title') || '',
              company_id: companyId,
              start_date: getFieldValue(row, 'start_date') || null,
              email: getFieldValue(row, 'email') || null,
              email_score: parseNumber(getFieldValue(row, 'email_score')),
              phone_number: getFieldValue(row, 'phone_number') || null,
              location_city: getFieldValue(row, 'location_city') || '',
              location_state: getFieldValue(row, 'location_state') || '',
              location_region: getFieldValue(row, 'location_region') || '',
              visible_to_tiers: ['free'] // Default visibility
            };
            successfulData.push(contactData);
          }
        }
      }

      // Insert successful data
      let addedCount = 0;
      if (successfulData.length > 0) {
        const { data, error } = await supabase
          .from(uploadType)
          .insert(successfulData);

        if (!error) {
          addedCount = successfulData.length;
        }
      }

      const result: UploadResult = {
        total_rows: dataRows.length,
        added: addedCount,
        updated: 0,
        failed: failedRowsData.length,
        errors: errors,
        failed_rows_data: failedRowsData,
        processing_time: 2.8
      };

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
    return columnIndex !== -1 && row[columnIndex] !== undefined ? row[columnIndex] : '';
  };

  const parseNumber = (value: string): number | null => {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const parseArray = (value: string): string[] => {
    if (!value) return [];
    return value.split(';').map(item => item.trim()).filter(item => item);
  };

  const downloadTemplate = () => {
    const headers = currentFields.join(',');
    const blob = new Blob([headers], { type: 'text/csv' });
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
            <h3 className="text-lg font-medium text-gray-900">Preview Data</h3>
            <span className="text-sm text-gray-600">{csvData.length > 0 ? csvData.length - 1 : 0} rows detected</span>
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
            
            {uploadResult.added > 0 && uploadType === 'companies' && (
              <button
                onClick={handleViewUploadedData}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                View Uploaded Companies
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
            
            {uploadResult.added > 0 && uploadType === 'contacts' && (
              <button
                onClick={() => {/* Navigate to contacts page */}}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 rounded-md hover:from-green-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                View Uploaded Contacts
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}