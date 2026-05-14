"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveManualProfile } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { ActivityLevel, BiologicalSex, Goal, MacroTargets, PhysicalMetrics } from "@/lib/types";

interface Props {
  onComplete: () => void;
  initialValues?: PhysicalMetrics;
  initialTargets?: MacroTargets;
}

export function ManualSetup({ onComplete, initialValues, initialTargets }: Props) {
  const { user, refreshUser } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [weight, setWeight] = useState(initialValues ? String(initialValues.weight) : "70");
  const [height, setHeight] = useState(initialValues ? String(initialValues.height) : "170");
  const [age, setAge] = useState(initialValues ? String(initialValues.age) : "25");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>(initialValues?.biologicalSex ?? "male");
  const [goal, setGoal] = useState<Goal>(initialValues?.goal ?? "maintenance");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialValues?.activityLevel ?? "moderate");
  const [calories, setCalories] = useState(initialTargets ? String(initialTargets.calories) : "2000");
  const [protein, setProtein] = useState(initialTargets ? String(initialTargets.protein) : "150");
  const [carbs, setCarbs] = useState(initialTargets ? String(initialTargets.carbs) : "200");
  const [fat, setFat] = useState(initialTargets ? String(initialTargets.fat) : "65");

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!user) return;
    startTransition(async () => {
      await saveManualProfile(
        user.id,
        {
          weight: parseFloat(weight),
          height: parseFloat(height),
          age: parseInt(age),
          biologicalSex,
          goal,
          activityLevel,
        },
        {
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fat: parseInt(fat),
        }
      );
      await refreshUser();
      onComplete();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="m-weight">Weight (kg)</Label>
          <Input id="m-weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-height">Height (cm)</Label>
          <Input id="m-height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-age">Age</Label>
          <Input id="m-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Biological Sex</Label>
        <Select value={biologicalSex} onValueChange={(v) => setBiologicalSex(v as BiologicalSex)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Goal</Label>
          <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weight_loss">Weight Loss</SelectItem>
              <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Activity Level</Label>
          <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v as ActivityLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="very_active">Very Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-3">Daily Macro Targets</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-cals">Calories</Label>
            <Input id="m-cals" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-protein">Protein (g)</Label>
            <Input id="m-protein" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-carbs">Carbs (g)</Label>
            <Input id="m-carbs" type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-fat">Fat (g)</Label>
            <Input id="m-fat" type="number" value={fat} onChange={(e) => setFat(e.target.value)} required />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Save & Continue"}
      </Button>
    </form>
  );
}
