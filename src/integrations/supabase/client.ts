// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://yqkiwxlxmxrxyxekspht.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxa2l3eGx4bXhyeHl4ZWtzcGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTI1MjMsImV4cCI6MjA1OTc2ODUyM30.CaPAj_p6zsR6afXL2keNy9E2vN9o7uvhS-f0MFx-9Xc";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);