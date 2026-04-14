const isClient = typeof window !== 'undefined';

export function getItem<T>(key: string): T | null {
  if (!isClient) return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (!isClient) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  if (!isClient) return;
  localStorage.removeItem(key);
}

export function generateId(): string {
  return crypto.randomUUID();
}
