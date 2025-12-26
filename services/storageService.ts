
import { User, Project, ProductionScript, WorldSetting } from '../types';

const USERS_KEY = 'cinegen_users';
const CURRENT_USER_KEY = 'cinegen_current_user';

// --- IndexedDB ---
const DB_NAME = 'CineGenDB_V2';
const STORE_PROJECTS = 'projects';
const STORE_WORLDS = 'world_settings';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e) => {
      const db = (e.target as any).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' }).createIndex('userId', 'userId');
      if (!db.objectStoreNames.contains(STORE_WORLDS)) db.createObjectStore(STORE_WORLDS, { keyPath: 'id' }).createIndex('userId', 'userId');
    };
    request.onsuccess = (e) => resolve((e.target as any).result);
  });
};

export const getCurrentUser = (): User | null => JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
export const logoutUser = () => localStorage.removeItem(CURRENT_USER_KEY);
export const loginUser = (email: string, password: string): User | null => {
    const adminPass = localStorage.getItem('admin_password') || 'admin';
    if (email === 'admin' && password === adminPass) {
        const admin = { email: 'admin', name: 'Manager', isAdmin: true };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(admin));
        return admin;
    }
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user || null;
};
export const registerUser = (user: User): boolean => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find(u => u.email === user.email)) return false;
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return true;
};

export const saveProject = async (userId: string, script: ProductionScript): Promise<Project> => {
  const db = await openDB();
  const project: Project = { id: crypto.randomUUID(), userId, title: script.title, createdAt: Date.now(), script };
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).add(project);
    tx.oncomplete = () => resolve(project);
  });
};

export const updateProject = async (projectId: string, script: ProductionScript): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(projectId);
    req.onsuccess = () => {
        const p = req.result;
        if (p) { p.script = script; p.title = script.title; store.put(p); }
    };
};

export const getUserProjects = async (userId: string): Promise<Project[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result.sort((a: any, b: any) => b.createdAt - a.createdAt));
  });
};

export const deleteProject = async (id: string) => {
    const db = await openDB();
    db.transaction(STORE_PROJECTS, 'readwrite').objectStore(STORE_PROJECTS).delete(id);
};

// --- World Services Fix ---
export const saveWorldSetting = async (userId: string, data: any): Promise<WorldSetting> => {
  const db = await openDB();
  const world: WorldSetting = {
    id: crypto.randomUUID(),
    userId,
    title: data.title || "New World",
    genre: data.script?.genre || "General",
    visualStyle: data.script?.selectedVisualStyle || "Cinematic",
    characters: data.script?.characters || [],
    locations: data.script?.locations || [],
    createdAt: Date.now()
  };
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_WORLDS, 'readwrite');
    tx.objectStore(STORE_WORLDS).add(world);
    tx.oncomplete = () => resolve(world);
  });
};

export const getUserWorlds = async (userId: string): Promise<WorldSetting[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_WORLDS, 'readonly');
    const req = tx.objectStore(STORE_WORLDS).index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result);
  });
};

export const deleteWorldSetting = async (id: string) => {
    const db = await openDB();
    db.transaction(STORE_WORLDS, 'readwrite').objectStore(STORE_WORLDS).delete(id);
};

// Fixed missing updateUserProfile for profile settings management
export const updateUserProfile = (email: string, updates: { name?: string, password?: string }): User | null => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const index = users.findIndex(u => u.email === email);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.email === email) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[index]));
    }
    return users[index];
};

// Fixed missing getAllUsers for admin dashboard analytics
export const getAllUsers = (): User[] => {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
};

// Fixed missing getAllProjects for global admin oversight
export const getAllProjects = async (): Promise<Project[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
    });
};

// Fixed missing updateAdminPassword for administrative security
export const updateAdminPassword = (password: string) => {
    localStorage.setItem('admin_password', password);
};

export const getAutoSave = () => {
    const data = localStorage.getItem('cinegen_autosave');
    return data ? JSON.parse(data) : null;
};

export const clearAutoSave = () => {
    localStorage.removeItem('cinegen_autosave');
};

export const subscribeToProjectUpdates = () => {};
