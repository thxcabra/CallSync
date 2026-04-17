import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthorContextValue {
  author: string | null;
  setAuthor: (name: string | null) => void;
}

const AuthorContext = createContext<AuthorContextValue | null>(null);
const STORAGE_KEY = 'callsync.author';

export function AuthorProvider({ children }: { children: ReactNode }) {
  const [author, setAuthorState] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAuthorState(saved);
  }, []);

  function setAuthor(name: string | null) {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
    setAuthorState(name);
  }

  return <AuthorContext.Provider value={{ author, setAuthor }}>{children}</AuthorContext.Provider>;
}

export function useAuthor() {
  const ctx = useContext(AuthorContext);
  if (!ctx) throw new Error('useAuthor must be inside AuthorProvider');
  return ctx;
}
