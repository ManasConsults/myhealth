"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Activity } from "lucide-react";

const DEMO_CREDENTIALS = [
  { username: "member", password: "member123", role: "User" },
  { username: "admin", password: "admin123", role: "Admin" },
];

export function LoginForm() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Navigate only after auth state has committed — calling router.push() in the
  // same tick as setUser() races the layout guard that bounces unauthenticated users.
  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(username.trim(), password);
    if (!ok) {
      setError("Invalid username or password.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm animate-fade-up">
      <CardHeader className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-primary/10 ring-4 ring-primary/5">
            <Activity className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl tracking-tight">MyHealth</CardTitle>
          <CardDescription>Health & Fitness Platform</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {/* Demo credentials — refined inset panel */}
        <div className="rounded-lg bg-muted/60 px-3 py-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Demo accounts
          </p>
          {DEMO_CREDENTIALS.map((c) => (
            <div key={c.username} className="flex items-center justify-between">
              <span className="font-mono text-xs text-foreground">
                {c.username} / {c.password}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">{c.role}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
