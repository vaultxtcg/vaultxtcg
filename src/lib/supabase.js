import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mkjbrkbptuyqxafzdmkd.supabase.co";

const supabaseKey = "sb_publishable_Gow1ey93zAKh3mEFKL6_IA_wz0-Svzg";

export const supabase = createClient(supabaseUrl, supabaseKey);