"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanBuilder } from "@/components/workout/PlanBuilder";
import { ExerciseLogger } from "@/components/workout/ExerciseLogger";
import { useAuth } from "@/lib/auth-context";
import { fetchWorkoutPlans, fetchWorkoutLog } from "@/lib/actions";
import { WorkoutLogEntry, WorkoutPlan } from "@/lib/types";

export default function WorkoutPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [log, setLog] = useState<WorkoutLogEntry[]>([]);

  async function reloadPlans() {
    if (user) setPlans(await fetchWorkoutPlans(user.id));
  }

  async function reloadLog() {
    if (user) setLog(await fetchWorkoutLog(user.id));
  }

  useEffect(() => {
    void reloadPlans();
    void reloadLog();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Workout</h1>
        <p className="text-muted-foreground text-sm">Track your training and build plans</p>
      </div>

      <Tabs defaultValue="log">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="log" className="flex-1 sm:flex-none">Exercise Log</TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 sm:flex-none">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-4">
          <ExerciseLogger userId={user.id} log={log} plans={plans} onUpdate={reloadLog} />
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <PlanBuilder userId={user.id} plans={plans} onUpdate={reloadPlans} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
