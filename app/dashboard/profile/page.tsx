"use client";

import { useState, useEffect, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { GuidedSetup } from "@/components/onboarding/GuidedSetup";
import { ManualSetup } from "@/components/onboarding/ManualSetup";
import { ColorPicker } from "@/components/ColorPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { fetchSettings, setPlanningMode, updateFullName } from "@/lib/actions";
import { ActivityLevel, GlobalSettings, GOAL_LABELS, PlanningMode } from "@/lib/types";
import { Pencil, Check, X } from "lucide-react";

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  very_active: "Very Active",
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

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
    setShowEditForm(false);
    setTimeout(() => setUpdated(false), 2500);
    void refreshUser();
  }

  function startEditingName() {
    setNameValue(user?.fullName ?? "");
    setEditingName(true);
  }

  function cancelEditingName() {
    setEditingName(false);
  }

  function handleSaveName() {
    if (!user) return;
    startTransition(async () => {
      await updateFullName(user.id, nameValue);
      setEditingName(false);
      await refreshUser();
    });
  }

  const hasProfile = user.metrics && user.macroTargets;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm">Your account details and health goals</p>
      </div>

      {/* Account info */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0 select-none">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="text-sm font-medium truncate">{user.username}</p>

              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Full Name</p>
                {editingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") cancelEditingName();
                      }}
                      placeholder="Your full name"
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveName} disabled={isPending} aria-label="Save">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEditingName} aria-label="Cancel">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-sm font-medium truncate">
                      {user.fullName ?? <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground" onClick={startEditingName} aria-label="Edit full name">
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {user.email && (
                <p className="text-sm text-muted-foreground truncate mt-2">{user.email}</p>
              )}
              <Badge variant="secondary" className="capitalize mt-1.5 text-xs">
                {user.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics & targets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Metrics & Goals</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditForm((v) => !v)}
            >
              {showEditForm ? "Cancel" : hasProfile ? "Edit" : "Set up"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          {hasProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Weight" value={`${user.metrics!.weight} kg`} />
                <Stat label="Height" value={`${user.metrics!.height} cm`} />
                <Stat label="Age" value={`${user.metrics!.age} yrs`} />
                <Stat label="Sex" value={user.metrics!.biologicalSex === "male" ? "Male" : "Female"} />
                <Stat label="Activity" value={ACTIVITY_LABELS[user.metrics!.activityLevel]} />
                <Stat label="Goal" value={GOAL_LABELS[user.metrics!.goal]} />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Daily Targets</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Calories" value={`${user.macroTargets!.calories} kcal`} />
                  <Stat label="Protein" value={`${user.macroTargets!.protein}g`} />
                  <Stat label="Carbs" value={`${user.macroTargets!.carbs}g`} />
                  <Stat label="Fat" value={`${user.macroTargets!.fat}g`} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No metrics set yet. Click &ldquo;Set up&rdquo; to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {updated && (
        <p role="status" className="text-sm text-primary font-medium text-center">
          Profile updated!
        </p>
      )}

      {/* Edit / setup form */}
      {showEditForm && (
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
                <GuidedSetup
                  formula={settings.tdeeFormula}
                  onComplete={handleComplete}
                  initialValues={user.metrics ?? undefined}
                />
              </TabsContent>
              <TabsContent value="manual">
                <ManualSetup
                  onComplete={handleComplete}
                  initialValues={user.metrics ?? undefined}
                  initialTargets={user.macroTargets ?? undefined}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Planning Mode */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Planning Mode</CardTitle>
            <Badge variant="outline" className="capitalize">{user.planningMode}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
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
