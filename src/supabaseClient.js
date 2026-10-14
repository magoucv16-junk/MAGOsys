import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://meyvxkrqzmertmpliquv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__Tkdod49jDRJ1hRdZ14cDA_RgMro2bp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
