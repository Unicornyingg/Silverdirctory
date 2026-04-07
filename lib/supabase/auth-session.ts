import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

function getAnonServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (authHeader.length > 8192) return null;

  const [prefix, token] = authHeader.split(" ");
  if (prefix?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  if (token.length < 20 || token.length > 4096) {
    return null;
  }
  return token;
}

export async function getAuthenticatedUserFromRequest(
  request: Request
): Promise<User | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const supabase = getAnonServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
