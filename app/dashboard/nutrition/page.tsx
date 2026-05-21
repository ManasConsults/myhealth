"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoodLog } from "@/components/diet/FoodLog";
import { NutritionPlanner } from "@/components/diet/NutritionPlanner";
import { NutritionReports } from "@/components/diet/NutritionReports";
import { useAuth } from "@/lib/auth-context";
import { fetchFoodLog, fetchNutritionPlans, fetchWaterLog } from "@/lib/actions";
import { FoodEntry, NutritionPlan, WaterEntry } from "@/lib/types";

export default function NutritionPage() {
  const { user } = useAuth();
  const [allEntries, setAllEntries] = useState<FoodEntry[]>([]);
  const [waterLog, setWaterLog] = useState<WaterEntry[]>([]);
  const [plans, setPlans] = useState<NutritionPlan[]>([]);

  async function reloadFood() {
    if (user) setAllEntries(await fetchFoodLog());
  }

  async function reloadWater() {
    if (user) setWaterLog(await fetchWaterLog());
  }

  async function reloadPlans() {
    if (user) setPlans(await fetchNutritionPlans());
  }

  async function reloadAll() {
    await Promise.all([reloadFood(), reloadWater()]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadFood();
    void reloadWater();
    void reloadPlans();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <p className="text-muted-foreground text-sm">Track your meals and build nutrition plans</p>
      </div>

      <Tabs defaultValue="log">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="log" className="flex-1 sm:flex-none">Food Log</TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 sm:flex-none">Plans</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 sm:flex-none">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-4">
          <FoodLog
            allEntries={allEntries}
            waterLog={waterLog}
            plans={plans}
            macroTargets={user.macroTargets}
            onUpdate={reloadAll}
          />
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <NutritionPlanner plans={plans} onUpdate={reloadPlans} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <NutritionReports
            allEntries={allEntries}
            waterLog={waterLog}
            macroTargets={user.macroTargets}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
