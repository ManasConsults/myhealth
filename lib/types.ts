export type PlanningMode = "guided" | "manual";
export type Goal = "weight_loss" | "muscle_gain" | "maintenance";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type TDEEFormula = "mifflin_st_jeor" | "harris_benedict" | "katch_mcardle";
export type UserRole = "user" | "admin";
export type MealType = "breakfast" | "lunch" | "snacks" | "dinner";

export interface PhysicalMetrics {
  weight: number; // kg
  height: number; // cm
  age: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface MacroTargets {
  calories: number;
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
}

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  planningMode: PlanningMode;
  metrics: PhysicalMetrics | null;
  macroTargets: MacroTargets | null;
  onboardingComplete: boolean;
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snacks", "dinner"];

export interface FoodEntry {
  id: string;
  userId: string;
  date: string; // ISO date string YYYY-MM-DD
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  createdAt: string;
}

export interface WaterEntry {
  id: string;
  userId: string;
  date: string;
  amountMl: number;
  createdAt: string;
}

export interface NutritionPlanFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionPlanMeal {
  type: MealType;
  foods: NutritionPlanFood[];
}

export interface NutritionPlan {
  id: string;
  userId: string;
  name: string;
  meals: NutritionPlanMeal[];
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

export interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number; // kg
}

export interface WorkoutLogEntry {
  id: string;
  userId: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

export interface WorkoutDay {
  day: string; // e.g. "Monday", "Push Day"
  label?: string; // e.g. "Chest", "Leg Day", "Pull"
  exercises: string[]; // exercise names
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  days: WorkoutDay[];
  createdAt: string;
}

export interface GlobalSettings {
  tdeeFormula: TDEEFormula;
}

export const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  maintenance: "Maintenance",
};
