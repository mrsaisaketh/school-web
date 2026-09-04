// Single entry point for every backend call, so the bearer token is attached
// in one place instead of at ~50 call sites.

const TOKEN_KEY = 'erp_token';
const USER_KEY = 'erp_user';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
};

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Drop-in replacement for fetch() against our own API: returns the same
 * Response object, so existing `res.ok` / `await res.json()` code is unchanged.
 * A 401 means the token is gone or expired — bounce to login rather than
 * letting the page render half-empty.
 */
export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login?expired=1');
    }
  }

  return res;
}
