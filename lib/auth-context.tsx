"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { UserProfile } from "./types";
import { loginUser, fetchUser } from "./actions";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);

  // Restore full UserProfile from Auth.js session on page load / refresh.
  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") {
      fetchUser().then((profile) => setUser(profile ?? null));
    } else if (status === "unauthenticated") {
      setUser(null); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [session, status]);

  async function login(email: string, password: string): Promise<boolean> {
    const profile = await loginUser(email, password);
    if (!profile) return false;

    try {
      await signIn("credentials", { email, password, redirect: false });
    } catch {
      // credentials already verified above — transient signIn error, proceed
    }

    setUser(profile);
    return true;
  }

  function logout(): void {
    setUser(null);
    void signOut({ callbackUrl: "/" });
  }

  async function refreshUser(): Promise<void> {
    if (!user && !session?.user?.id) return;
    const fresh = await fetchUser();
    if (fresh) setUser({ ...fresh });
  }

  return (
    <AuthContext.Provider value={{ user, loading: user === null && status !== "unauthenticated", login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
