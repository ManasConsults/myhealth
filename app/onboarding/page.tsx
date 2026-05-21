"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuidedSetup } from "@/components/onboarding/GuidedSetup";
import { ManualSetup } from "@/components/onboarding/ManualSetup";
import { useAuth } from "@/lib/auth-context";
import { fetchSettings } from "@/lib/actions";
import { GlobalSettings } from "@/lib/types";
import { Activity, Brain, Dumbbell } from "lucide-react";

export default function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "setup">("choose");
  const [mode, setMode] = useState<"guided" | "manual">("guided");
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
    else if (user.onboardingComplete) router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    void fetchSettings().then(setSettings);
  }, []);

  if (loading || !user) return null;

  function handleComplete() {
    refreshUser();
    router.push("/dashboard");
  }

  if (step === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted/30 p-4">
        <div className="w-full max-w-lg space-y-6 animate-fade-up">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-2xl bg-primary/10 ring-4 ring-primary/5">
                <Activity className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to MyHealth</h1>
            <p className="text-muted-foreground text-sm">Choose how you&apos;d like to set up your fitness plan</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all ${
                mode === "guided" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              }`}
              onClick={() => setMode("guided")}
            >
              <CardHeader className="pb-3">
                <div className="p-2 w-fit rounded-xl bg-primary/10 mb-2">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Smart Engine</CardTitle>
                <CardDescription className="text-xs">
                  Tell us your stats and we&apos;ll calculate your optimal calorie & macro targets automatically using TDEE science.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${
                mode === "manual" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              }`}
              onClick={() => setMode("manual")}
            >
              <CardHeader className="pb-3">
                <div className="p-2 w-fit rounded-xl bg-muted mb-2">
                  <Dumbbell className="w-5 h-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">Expert Mode</CardTitle>
                <CardDescription className="text-xs">
                  You know what you want. Set your own calorie and macro targets and take full control of your plan.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Button className="w-full" onClick={() => setStep("setup")}>
            Continue with {mode === "guided" ? "Smart Engine" : "Expert Mode"} →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{mode === "guided" ? "Smart Engine Setup" : "Expert Mode Setup"}</CardTitle>
          <CardDescription>
            {mode === "guided"
              ? "Enter your metrics and we'll calculate your daily targets."
              : "Define your own daily calorie and macro targets."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "guided" | "manual")}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="guided" className="flex-1">Guided</TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
            </TabsList>
            <TabsContent value="guided">
              {settings ? (
                <GuidedSetup formula={settings.tdeeFormula} onComplete={handleComplete} />
              ) : null}
            </TabsContent>
            <TabsContent value="manual">
              <ManualSetup onComplete={handleComplete} />
            </TabsContent>
          </Tabs>
          <Button variant="ghost" className="w-full mt-3 text-muted-foreground" onClick={() => setStep("choose")}>
            ← Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
