import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This admin client bypasses Row Level Security (RLS)
// NEVER use this client on the frontend or expose it.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
