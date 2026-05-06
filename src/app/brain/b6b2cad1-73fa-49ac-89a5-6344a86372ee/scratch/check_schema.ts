import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szpizwqoososzqsfbdhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cGl6d3Fvb3Nvc3pxc2ZiZGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQ4OTMsImV4cCI6MjA5MzQwMDg5M30.qkw8CqK1fKj3F47y0jTnuDUyPqrg76LtC20Fv62LDgw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking order_items schema...");
  const { data, error } = await supabase.from('order_items').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Columns found in order_items:", Object.keys(data[0] || {}));
    
    console.log("\nSample row from order_items:");
    console.log(data[0]);
  }
}

checkSchema();
