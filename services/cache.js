import supabase from './supabaseClient.js';

export async function getFromCache(key) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('cache')
    .select('value')
    .eq('key', key)
    .gte('expires_at', now)
    .single();

  if (error || !data) return null;
  return data.value;
}

export async function saveToCache(key, value, ttlMinutes = 60) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();

  const { error } = await supabase
    .from('cache')
    .upsert({ key, value, expires_at: expiresAt });

  if (error) console.error('Cache save failed:', error.message);
}
