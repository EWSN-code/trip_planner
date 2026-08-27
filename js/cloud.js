import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG } from "../config.js";
let client = null;
export const isCloudConfigured = () =>
  Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.publishableKey);
export function getCloudClient() {
  if (!isCloudConfigured()) return null;
  if (!client)
    client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  return client;
}
export async function getCurrentSession() {
  const db = getCloudClient();
  if (!db) return null;
  const { data, error } = await db.auth.getSession();
  if (error) throw error;
  return data.session;
}
export async function signIn(email, password) {
  const { data, error } = await getCloudClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}
export async function signUp(email, password) {
  const { data, error } = await getCloudClient().auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}
export async function signOut() {
  const db = getCloudClient();
  if (db) {
    const { error } = await db.auth.signOut();
    if (error) throw error;
  }
}
export async function fetchCloudState(userId) {
  const { data, error } = await getCloudClient()
    .from(SUPABASE_CONFIG.table)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertCloudState(userId, state) {
  const { error } = await getCloudClient()
    .from(SUPABASE_CONFIG.table)
    .upsert(
      { user_id: userId, data: state, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
