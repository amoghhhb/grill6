import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szpizwqoososzqsfbdhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cGl6d3Fvb3Nvc3pxc2ZiZGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQ4OTMsImV4cCI6MjA5MzQwMDg5M30.qkw8CqK1fKj3F47y0jTnuDUyPqrg76LtC20Fv62LDgw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
  console.log("Checking all unique roles in the profiles table...");
  const { data, error } = await supabase.from('profiles').select('role');
  if (error) {
    console.error("Error:", error);
  } else {
    const roles = [...new Set(data.map(p => p.role || 'NULL'))];
    console.log("Roles found in DB:", roles);
  }
}

checkRoles();
