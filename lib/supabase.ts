import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eorjmkkfecahzzfnnhtg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcmpta2tmZWNhaHp6Zm5uaHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDUxNzcsImV4cCI6MjA5NDA4MTE3N30.YQewtwyIK5bzzUDmlSdF8M2rrni4u6i1COlRyqUTFwE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
