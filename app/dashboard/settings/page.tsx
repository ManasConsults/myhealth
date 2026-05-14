"use client";

import { useState, useEffect, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuidedSetup } from "@/components/onboarding/GuidedSetup";
import { ManualSetup } from "@/components/onboarding/ManualSetup";
import { ColorPicker } from "@/components/ColorPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { fetchSettings, setPlanningMode } from "@/lib/actions";
import { GlobalSettings, GOAL_LABELS, PlanningMode } from "@/lib/types";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    void fetchSettings().then(setSettings);
  }, []);

  if (!user || !settings) return null;

  function handleModeSwitch(mode: PlanningMode) {
    if (!user) return;
    startTransition(async () => {
      await setPlanningMode(user.id, mode);
      await refreshUser();
    });
  }

  function handleComplete() {
    setUpdated(true);
    setTimeout(() => setUpdated(false), 2500);
    void refreshUser();
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your profile and planning mode</p>
      </div>

      {/* Current profile summary */}
      {user.metrics && user.macroTargets && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4">
            <Stat label="Weight" value={`${user.metrics.weight} kg`} />
            <Stat label="Height" value={`${user.metrics.height} cm`} />
            <Stat label="Goal" value={GOAL_LABELS[user.metrics.goal]} />
            <Stat label="Calories" value={`${user.macroTargets.calories} kcal`} />
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="pb-5 space-y-5">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Colour theme</p>
            <ColorPicker />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Light / Dark mode</p>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Mode switcher */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Planning Mode</CardTitle>
            <Badge variant="outline" className="capitalize">{user.planningMode}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={user.planningMode === "guided" ? "default" : "outline"}
              className="h-auto py-3 flex-col gap-1"
              onClick={() => handleModeSwitch("guided")}
              disabled={isPending}
            >
              <span className="font-medium text-sm">Smart Engine</span>
              <span className="text-xs opacity-70">Auto-calculate targets</span>
            </Button>
            <Button
              variant={user.planningMode === "manual" ? "default" : "outline"}
              className="h-auto py-3 flex-col gap-1"
              onClick={() => handleModeSwitch("manual")}
              disabled={isPending}
            >
              <span className="font-medium text-sm">Expert Mode</span>
              <span className="text-xs opacity-70">Set your own targets</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {updated && (
        <p role="status" className="text-sm text-primary font-medium text-center animate-fade-up">Profile updated!</p>
      )}

      {/* Re-run setup */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Update Metrics & Targets</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <Tabs defaultValue={user.planningMode}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="guided" className="flex-1">Guided</TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
            </TabsList>
            <TabsContent value="guided">
              <GuidedSetup formula={settings.tdeeFormula} onComplete={handleComplete} />
            </TabsContent>
            <TabsContent value="manual">
              <ManualSetup onComplete={handleComplete} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
