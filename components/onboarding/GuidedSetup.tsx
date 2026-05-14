"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveGuidedProfile } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { ActivityLevel, BiologicalSex, Goal, PhysicalMetrics, TDEEFormula } from "@/lib/types";
import { calcMacros, calcTDEE } from "@/lib/calculations";

interface Props {
  formula: TDEEFormula;
  onComplete: () => void;
  initialValues?: PhysicalMetrics;
}

export function GuidedSetup({ formula, onComplete, initialValues }: Props) {
  const { user, refreshUser } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [weight, setWeight] = useState(initialValues ? String(initialValues.weight) : "70");
  const [height, setHeight] = useState(initialValues ? String(initialValues.height) : "170");
  const [age, setAge] = useState(initialValues ? String(initialValues.age) : "25");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>(initialValues?.biologicalSex ?? "male");
  const [goal, setGoal] = useState<Goal>(initialValues?.goal ?? "maintenance");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialValues?.activityLevel ?? "moderate");

  const metrics = {
    weight: parseFloat(weight) || 0,
    height: parseFloat(height) || 0,
    age: parseInt(age) || 0,
    biologicalSex,
    goal,
    activityLevel,
  };

  const preview =
    metrics.weight > 0 && metrics.height > 0 && metrics.age > 0
      ? { tdee: calcTDEE(metrics, formula), macros: calcMacros(metrics, formula) }
      : null;

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!user) return;
    startTransition(async () => {
      await saveGuidedProfile(user.id, metrics, formula);
      await refreshUser();
      onComplete();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} min={30} max={300} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="height">Height (cm)</Label>
          <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} min={100} max={250} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} min={10} max={120} required />
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
              <SelectItem value="sedentary">Sedentary (desk job)</SelectItem>
              <SelectItem value="light">Light (1–3x/week)</SelectItem>
              <SelectItem value="moderate">Moderate (3–5x/week)</SelectItem>
              <SelectItem value="active">Active (6–7x/week)</SelectItem>
              <SelectItem value="very_active">Very Active (athlete)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {preview && (
        <Card className="bg-muted/40">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium">Calculated Targets</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4">
            <Stat label="TDEE" value={`${preview.tdee} kcal`} />
            <Stat label="Calories" value={`${preview.macros.calories} kcal`} />
            <Stat label="Protein" value={`${preview.macros.protein}g`} />
            <Stat label="Carbs" value={`${preview.macros.carbs}g`} />
            <Stat label="Fat" value={`${preview.macros.fat}g`} />
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Save & Continue"}
      </Button>
    </form>
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
