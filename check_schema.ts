import { supabase } from './src/lib/supabase';

async function checkSchema() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching coupons:', error);
  } else {
    console.log('Columns found:', data && data.length > 0 ? Object.keys(data[0]) : 'No rows found to detect columns');
  }
}

checkSchema();
