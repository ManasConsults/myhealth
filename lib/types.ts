export type PlanningMode = "guided" | "manual";
export type Goal = "weight_loss" | "muscle_gain" | "maintenance";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type TDEEFormula = "mifflin_st_jeor" | "harris_benedict" | "katch_mcardle";
export type BiologicalSex = "male" | "female";
export type UserRole = "user" | "admin";
export type MealType = "breakfast" | "lunch" | "snacks" | "dinner";
export type UserStatus = "pending" | "approved" | "rejected";
export type ExerciseType = "push" | "pull" | "legs" | "core" | "cardio" | "stretch";

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  cardio: "Cardio",
  stretch: "Stretch",
};

export const EXERCISE_TYPE_OPTIONS: ExerciseType[] = ["push", "pull", "legs", "core", "cardio", "stretch"];

export interface PhysicalMetrics {
  weight: number; // kg
  height: number; // cm
  age: number;
  biologicalSex: BiologicalSex;
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
  email?: string;
  username: string;
  fullName?: string;
  role: UserRole;
  status: UserStatus;
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

export interface ExerciseLibrary {
  id: string;
  name: string;
  muscleGroup: string;
  type?: ExerciseType;
  instructions?: string;
  createdAt: string;
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

export const FOOD_UNIT_OPTIONS = ["g", "oz", "ml", "piece", "slice", "serving", "cup", "tbsp", "tsp"] as const;
export type FoodUnit = typeof FOOD_UNIT_OPTIONS[number];

// Fixed gram conversion for weight/volume units — no per-unit input needed
export const UNIT_GRAM_FACTORS: Partial<Record<FoodUnit, number>> = {
  g: 1,
  oz: 28.35,
  ml: 1,
};

// Sensible defaults when user first selects a variable unit
export const VARIABLE_UNIT_DEFAULTS: Partial<Record<FoodUnit, number>> = {
  piece: 100,
  slice: 30,
  serving: 100,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

export function isVariableUnit(unit: FoodUnit): boolean {
  return !(unit in UNIT_GRAM_FACTORS);
}

export function gramsFromUnit(qty: number, unit: FoodUnit, gramsPerUnit: number): number {
  const factor = UNIT_GRAM_FACTORS[unit];
  return factor !== undefined ? qty * factor : qty * gramsPerUnit;
}

export interface FoodSearchResult {
  fdcId: number;
  name: string;
  brand?: string;
  // values are per 100g
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingUnit: FoodUnit;
  gramsPerServing: number;
}
