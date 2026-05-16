export async function loadLiveShieldRules({ supabaseUrl, anonKey, token, fallback = {} }) {
  if (!supabaseUrl || !anonKey) return fallback;
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json'
  };
  const base = supabaseUrl.replace(/\/$/, '');
  async function get(path) {
    const res = await fetch(`${base}/rest/v1/${path}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  const [prompts, scoring, impacts] = await Promise.all([
    get('shield_prompt_rules?is_active=eq.true&select=*'),
    get('shield_scoring_rules?enabled=eq.true&select=*'),
    get('shield_risk_impacts?enabled=eq.true&select=*')
  ]);
  return { prompts, scoring, impacts };
}
