import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szpizwqoososzqsfbdhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cGl6d3Fvb3Nvc3pxc2ZiZGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQ4OTMsImV4cCI6MjA5MzQwMDg5M30.qkw8CqK1fKj3F47y0jTnuDUyPqrg76LtC20Fv62LDgw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTheColumn() {
  console.log("Testing common column names for order_items...");
  
  const testNames = ['menu_item_id', 'item_id', 'dish_id', 'item_name', 'product_id'];
  
  for (const name of testNames) {
    const { error } = await supabase.from('order_items').select(name).limit(1);
    if (!error) {
      console.log(`✅ FOUND COLUMN: ${name}`);
    } else {
      console.log(`❌ NOT FOUND: ${name}`);
    }
  }

  // Also check if 'id' exists (it usually does as a PK)
  const { data } = await supabase.from('order_items').select('*').limit(1);
  console.log("All current columns:", Object.keys(data?.[0] || {}));
}

findTheColumn();
