import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { secretsStorage } from "../utils/secretStore";

const supabase_url = "https://zuoncclntljpcqzcbkkp.supabase.co";
const anon_key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1b25jY2xudGxqcGNxemNia2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTE2NjQwNzIsImV4cCI6MjAyNzI0MDA3Mn0._F49Jz7WG9zlglHB1gXnwhLcvo2VKg5UQuO2FB1HDUM";

let supabaseLocal: null | SupabaseClient<any, "public", any> = null;

export const getSuppabaseClient = () => {
  if (supabaseLocal) {
    return supabaseLocal;
  } else {
    const supabase = createClient(supabase_url, anon_key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // debug: true,
        storage: secretsStorage,
      },
    });
    supabaseLocal = supabase;
    return supabase;
  }
};
