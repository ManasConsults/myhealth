"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { UserProfile } from "./types";
import { validateLogin } from "./mock-store";
import { fetchUser } from "./actions";

interface AuthContextValue {
  user: UserProfile | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  async function login(username: string, password: string): Promise<boolean> {
    const found = validateLogin(username, password);
    if (!found) return false;
    // Fetch server-side state so we get the real onboardingComplete / metrics
    const fresh = await fetchUser(found.id);
    setUser(fresh ?? found);
    return true;
  }

  function logout() {
    setUser(null);
  }

  async function refreshUser(): Promise<void> {
    if (!user) return;
    const fresh = await fetchUser(user.id);
    if (fresh) setUser({ ...fresh });
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
