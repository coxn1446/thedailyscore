export async function fetchAuthConfig() {
  try {
    const res = await fetch('/api/auth/config', { credentials: 'include' });
    if (!res.ok) return { googleClientId: null, appleClientId: null };
    return res.json();
  } catch {
    return { googleClientId: null, appleClientId: null };
  }
}
