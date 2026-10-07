"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Activity, Eye, EyeOff } from "lucide-react";

const DEMO_CREDENTIALS = [
  { email: "member@demo.com", password: "member123", role: "User" },
  { email: "admin@demo.com", password: "admin123", role: "Admin" },
];

function OAuthButton({ label, icon, onClick, loading }: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      disabled={loading}
      onClick={onClick}
    >
      {icon}
      {loading ? "Redirecting…" : label}
    </Button>
  );
}

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const profile = await login(email.trim().toLowerCase(), password);
    if (!profile) {
      setError("Invalid credentials.");
      setLoading(false);
      return;
    }
    // Go straight to onboarding when needed — the dashboard's client-side redirect can be dropped by the
    // router while its data-fetching server actions are in flight.
    router.push(profile.onboardingComplete ? "/dashboard" : "/onboarding");
  }

  function handleOAuth(provider: string) {
    setOauthLoading(provider);
    void signIn(provider, { callbackUrl: "/dashboard" });
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
        {/* OAuth providers */}
        <div className="space-y-2">
          <OAuthButton
            label="Continue with GitHub"
            loading={oauthLoading === "github"}
            onClick={() => handleOAuth("github")}
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            }
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p role="alert" aria-live="assertive" className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="text-primary underline underline-offset-2">
            Create an account
          </Link>
        </p>

        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-lg bg-muted/60 px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Demo accounts
            </p>
            {DEMO_CREDENTIALS.map((c) => (
              <div key={c.email} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="font-mono text-xs text-foreground text-left hover:text-primary transition-colors"
                  onClick={() => { setEmail(c.email); setPassword(c.password); }}
                >
                  {c.email}
                </button>
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">{c.role}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
