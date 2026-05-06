import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szpizwqoososzqsfbdhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cGl6d3Fvb3Nvc3pxc2ZiZGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQ4OTMsImV4cCI6MjA5MzQwMDg5M30.qkw8CqK1fKj3F47y0jTnuDUyPqrg76LtC20Fv62LDgw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Fetching order_items column info via RPC or just trying to insert a test row...");
  
  // Try to insert a test row to see the error message which usually lists valid columns
  const { error } = await supabase.from('order_items').insert([{ invalid_column: 'test' }]);
  console.log("Error details (will show column info):", error?.message);
}

checkSchema();
