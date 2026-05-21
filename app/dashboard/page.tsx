"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MacroDonut } from "@/components/MacroDonut";
import { useAuth } from "@/lib/auth-context";
import { fetchFoodLog, fetchWorkoutLog } from "@/lib/actions";
import { useDailyTotals, useRemainingMacros } from "@/hooks/useCalculations";
import { FoodEntry, GOAL_LABELS, WorkoutLogEntry } from "@/lib/types";
import { Apple, Dumbbell, Flame, Target } from "lucide-react";

const MACRO_COLORS = {
  protein: "var(--chart-1)",
  carbs: "var(--chart-3)",
  fat: "var(--chart-4)",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLogEntry[]>([]);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (user && !user.onboardingComplete) router.replace("/onboarding");
  }, [user, router]);

  useEffect(() => {
    if (user) {
      void fetchFoodLog(today).then(setEntries);
      void fetchWorkoutLog(today).then(setWorkoutLog);
    }
  }, [user, today]);

  const totals = useDailyTotals(entries);
  const remaining = useRemainingMacros(user?.macroTargets ?? null, totals);

  if (!user) return null;

  const calorieTarget = user.macroTargets?.calories ?? 0;
  const caloriePct = calorieTarget > 0 ? Math.min(100, (totals.calories / calorieTarget) * 100) : 0;
  const totalSets = workoutLog.reduce((sum, e) => sum + e.sets.length, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Good day, {user.username}</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: <Flame className="w-4 h-4" />,
            iconClass: "text-orange-500 bg-orange-500/10",
            label: "Calories left",
            value: remaining ? `${remaining.calories}` : "—",
            sub: calorieTarget > 0 ? `of ${calorieTarget} kcal` : "no target set",
            delay: 80,
          },
          {
            icon: <Target className="w-4 h-4" />,
            iconClass: "text-primary bg-primary/10",
            label: "Goal",
            value: user.metrics?.goal ? GOAL_LABELS[user.metrics.goal] : "—",
            sub: "active goal",
            delay: 140,
          },
          {
            icon: <Apple className="w-4 h-4" />,
            iconClass: "text-green-500 bg-green-500/10",
            label: "Foods logged",
            value: `${entries.length}`,
            sub: "today",
            delay: 200,
          },
          {
            icon: <Dumbbell className="w-4 h-4" />,
            iconClass: "text-violet-500 bg-violet-500/10",
            label: "Exercises",
            value: `${workoutLog.length}`,
            sub: totalSets > 0 ? `${totalSets} sets today` : "none logged",
            delay: 260,
          },
        ].map((stat) => (
          <div key={stat.label} className="animate-fade-up" style={{ animationDelay: `${stat.delay}ms` }}>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${stat.iconClass}`}>
                  {stat.icon}
                </div>
                <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                <p className="text-lg font-bold leading-tight mt-0.5 truncate">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub ?? " "}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Calorie progress */}
      <div className="animate-fade-up" style={{ animationDelay: "320ms" }}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Daily Calories</CardTitle>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {totals.calories} / {calorieTarget > 0 ? calorieTarget : "—"} kcal
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            <Progress value={caloriePct} className="h-2.5" />
            <p className="text-xs text-muted-foreground">{Math.round(caloriePct)}% of daily target</p>
          </CardContent>
        </Card>
      </div>

      {/* Macro donuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "380ms" }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Consumed</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-4">
            <MacroDonut
              center={`${totals.calories}`}
              slices={[
                { label: "Protein", value: totals.protein, color: MACRO_COLORS.protein },
                { label: "Carbs", value: totals.carbs, color: MACRO_COLORS.carbs },
                { label: "Fat", value: totals.fat, color: MACRO_COLORS.fat },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-4">
            {remaining ? (
              <MacroDonut
                center={`${remaining.calories}`}
                slices={[
                  { label: "Protein", value: remaining.protein, color: MACRO_COLORS.protein },
                  { label: "Carbs", value: remaining.carbs, color: MACRO_COLORS.carbs },
                  { label: "Fat", value: remaining.fat, color: MACRO_COLORS.fat },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Set up your profile to see targets.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workout log */}
      <div className="animate-fade-up" style={{ animationDelay: "440ms" }}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Today&apos;s Workout</CardTitle>
              <span className="text-xs text-muted-foreground">
                {workoutLog.length > 0 ? `${workoutLog.length} exercise${workoutLog.length === 1 ? "" : "s"} · ${totalSets} sets` : "No workout logged"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {workoutLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No exercises logged yet today.
              </p>
            ) : (
              <ul className="space-y-2">
                {workoutLog.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-violet-500/10 shrink-0">
                        <Dumbbell className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      <span className="text-sm font-medium truncate">{entry.exerciseName}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold tabular-nums">{entry.sets.length}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {entry.sets.length === 1 ? "set" : "sets"}
                      </span>
                      {entry.sets.length > 0 && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {entry.sets[entry.sets.length - 1].weight}kg × {entry.sets[entry.sets.length - 1].reps}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "500ms" }}>
        <button onClick={() => router.push("/dashboard/nutrition")} className="text-left w-full">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="p-2 rounded-xl bg-green-500/10 shrink-0">
                <Apple className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Log Food</p>
                <p className="text-xs text-muted-foreground">Track nutrition</p>
              </div>
            </CardContent>
          </Card>
        </button>
        <button onClick={() => router.push("/dashboard/workout")} className="text-left w-full">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="p-2 rounded-xl bg-violet-500/10 shrink-0">
                <Dumbbell className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Log Workout</p>
                <p className="text-xs text-muted-foreground">Record training</p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
}
