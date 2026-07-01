import { supabase, supabaseAdmin } from './supabase';
import * as XLSX from 'xlsx';

export const exportToExcel = async ({
  tableName,
  activeFilters,
  searchQuery,
  customQueryBuilder = null,
  fileName = 'export.xlsx'
}) => {
  let allData = [];
  let from = 0;
  const step = 1000;
  
  const client = supabaseAdmin || supabase;
  
  while (true) {
    let query = client.from(tableName).select('*');
    
    // Apply search query
    if (searchQuery) {
      if (tableName === 'crm_leads') {
        query = query.or(`nom_entreprise.ilike.%${searchQuery}%,siret.ilike.%${searchQuery}%,projet.ilike.%${searchQuery}%`);
      } else {
        query = query.or(`nom_entreprise.ilike.%${searchQuery}%,siret.ilike.%${searchQuery}%`);
      }
    }
    
    // Apply filters
    if (activeFilters) {
      Object.entries(activeFilters).forEach(([field, values]) => {
        if (values && values.length > 0) {
          const ilikeConditions = values.flatMap(v => {
            const safeVal = String(v).replace(/[^\x00-\x7F]/g, '%');
            if (field === 'code_naf') return [`code_naf.ilike.${safeVal}`, `secteur.ilike.${safeVal}`];
            return [`${field}.ilike.${safeVal}`];
          }).join(',');
          query = query.or(ilikeConditions);
        }
      });
    }

    if (customQueryBuilder) {
      query = customQueryBuilder(query);
    }

    const { data, error } = await query.range(from, from + step - 1);
    
    if (error) {
      console.error("Export error:", error);
      throw error;
    }
    
    if (!data || data.length === 0) break;
    
    allData.push(...data);
    
    if (data.length < step) break;
    from += step;
  }

  if (allData.length === 0) {
    alert("Aucune donnée à exporter.");
    return 0;
  }

  const ws = XLSX.utils.json_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, fileName);
  
  return allData.length;
};
