import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client for server actions only. It bypasses RLS, so every query
// built on top of it is responsible for its own authorization checks.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
