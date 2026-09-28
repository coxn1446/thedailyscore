const STORAGE_PREFIX = 'ds:';

const memory = new Map();

export const AUTH_USER_KEY = 'auth:user';

const storageKey = (key) => `${STORAGE_PREFIX}${key}`;

const matchesPrefix = (key, prefix) => key === prefix || key.startsWith(`${prefix}:`);

const persist = () => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
};

export function cacheGet(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    const store = persist();
    if (!store) return undefined;
    const raw = store.getItem(storageKey(key));
    if (raw == null) return undefined;
    const value = JSON.parse(raw);
    memory.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

export function cacheSet(key, value) {
  memory.set(key, value);
  try {
    const store = persist();
    if (!store) return;
    store.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    /* quota or private mode */
  }
}

export function cacheDelete(key) {
  memory.delete(key);
  try {
    const store = persist();
    if (!store) return;
    store.removeItem(storageKey(key));
  } catch {
    /* ignore */
  }
}

export function cacheDeletePrefix(prefix) {
  [...memory.keys()]
    .filter((key) => matchesPrefix(key, prefix))
    .forEach((key) => memory.delete(key));
  try {
    const store = persist();
    if (!store) return;
    const toRemove = [];
    for (let i = 0; i < store.length; i += 1) {
      const full = store.key(i);
      if (!full || !full.startsWith(STORAGE_PREFIX)) continue;
      const key = full.slice(STORAGE_PREFIX.length);
      if (matchesPrefix(key, prefix)) toRemove.push(full);
    }
    toRemove.forEach((full) => store.removeItem(full));
  } catch {
    /* ignore */
  }
}

export function cacheClear() {
  memory.clear();
  try {
    const store = persist();
    if (!store) return;
    const toRemove = [];
    for (let i = 0; i < store.length; i += 1) {
      const full = store.key(i);
      if (full && full.startsWith(STORAGE_PREFIX)) toRemove.push(full);
    }
    toRemove.forEach((full) => store.removeItem(full));
  } catch {
    /* ignore */
  }
}
