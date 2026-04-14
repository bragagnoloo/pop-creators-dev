import { AuthUser, AuthResult, UserProfile } from '@/types';
import { getItem, setItem, removeItem, generateId } from '@/lib/storage';
import { STORAGE_KEYS, ADMIN_SEED } from '@/lib/constants';

function getUsers(): AuthUser[] {
  return getItem<AuthUser[]>(STORAGE_KEYS.USERS) || [];
}

function saveUsers(users: AuthUser[]): void {
  setItem(STORAGE_KEYS.USERS, users);
}

export function getAllUsers(): AuthUser[] {
  return getUsers();
}

export function seedAdmin(): void {
  const users = getUsers();
  if (users.some(u => u.role === 'admin')) return;
  const admin: AuthUser = {
    id: generateId(),
    email: ADMIN_SEED.email,
    password: btoa(ADMIN_SEED.password),
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, admin]);

  const profiles = getItem<UserProfile[]>(STORAGE_KEYS.PROFILES) || [];
  profiles.push({
    userId: admin.id,
    fullName: 'Administrador POPline',
    email: admin.email,
    whatsapp: '',
    photoUrl: null,
    bio: '',
    instagram: '',
    instagramFollowers: '',
    tiktok: '',
    tiktokFollowers: '',
    cep: '',
    state: '',
    city: '',
    neighborhood: '',
    address: '',
    onboardingComplete: true,
  });
  setItem(STORAGE_KEYS.PROFILES, profiles);
}

export function login(email: string, password: string): AuthResult {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user || user.password !== btoa(password)) {
    return { success: false, error: 'Email ou senha incorretos.' };
  }
  setItem(STORAGE_KEYS.SESSION, user);
  return { success: true, user };
}

export function register(email: string, password: string): AuthResult {
  const users = getUsers();
  if (users.some(u => u.email === email)) {
    return { success: false, error: 'Este email ja esta cadastrado.' };
  }
  const user: AuthUser = {
    id: generateId(),
    email,
    password: btoa(password),
    role: 'creator',
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);

  const profiles = getItem<UserProfile[]>(STORAGE_KEYS.PROFILES) || [];
  profiles.push({
    userId: user.id,
    fullName: '',
    email: user.email,
    whatsapp: '',
    photoUrl: null,
    bio: '',
    instagram: '',
    instagramFollowers: '',
    tiktok: '',
    tiktokFollowers: '',
    cep: '',
    state: '',
    city: '',
    neighborhood: '',
    address: '',
    onboardingComplete: false,
  });
  setItem(STORAGE_KEYS.PROFILES, profiles);
  setItem(STORAGE_KEYS.SESSION, user);
  return { success: true, user };
}

export function logout(): void {
  removeItem(STORAGE_KEYS.SESSION);
}

export function getCurrentUser(): AuthUser | null {
  return getItem<AuthUser>(STORAGE_KEYS.SESSION);
}
