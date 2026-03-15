import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://jfvydtyvzuwjvfctwkyb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L-_zqSir9uFvtNSSuofI0g_FRt9cqPk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
