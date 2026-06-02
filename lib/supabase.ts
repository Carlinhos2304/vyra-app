import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nscpuxrsdqjclelhhzts.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zY3B1eHJzZHFqY2xlbGhoenRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzc3NzcsImV4cCI6MjA5NTY1Mzc3N30.4R5d6WI717f4Mc6eGdf0DAwPuLztfkv7H9dT_hkr5Q4';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);