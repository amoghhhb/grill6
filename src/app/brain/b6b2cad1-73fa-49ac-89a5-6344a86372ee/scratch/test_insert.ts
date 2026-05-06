import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szpizwqoososzqsfbdhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cGl6d3Fvb3Nvc3pxc2ZiZGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQ4OTMsImV4cCI6MjA5MzQwMDg5M30.qkw8CqK1fKj3F47y0jTnuDUyPqrg76LtC20Fv62LDgw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Attempting test insert into order_items...");
  
  const { data, error } = await supabase.from('order_items').insert([
    {
      order_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      item_name: 'Test Item',
      quantity: 1,
      price: 100
    }
  ]).select();

  if (error) {
    console.error("Insert Error:", error.message);
  } else {
    console.log("Insert Success! Row added:", data);
  }
}

testInsert();
