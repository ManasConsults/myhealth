"use server";

import {
  addFoodEntry,
  addNutritionPlan,
  updateNutritionPlan,
  addWaterEntry,
  addWorkoutLogEntry,
  addWorkoutPlan,
  deleteFoodEntry,
  deleteFoodEntriesForDate,
  deleteNutritionPlan,
  deleteWaterEntry,
  deleteWorkoutLogEntry,
  deleteWorkoutLogEntriesForDate,
  deleteWorkoutPlan,
  updateWorkoutPlan,
  getAllUsers,
  getFoodLog,
  getNutritionPlans,
  getSettings,
  getUser,
  getWaterLog,
  getWorkoutLog,
  getWorkoutPlans,
  updateSettings,
  updateUser,
  updateWorkoutLogEntry as updateWorkoutLogEntryInStore,
} from "./mock-store";
import { calcMacros } from "./calculations";
import {
  FoodEntry,
  GlobalSettings,
  MacroTargets,
  NutritionPlan,
  NutritionPlanMeal,
  PhysicalMetrics,
  PlanningMode,
  UserProfile,
  WaterEntry,
  WorkoutDay,
  WorkoutLogEntry,
  WorkoutPlan,
  WorkoutSet,
} from "./types";

// ---------------------------------------------------------------------------
// Profile / onboarding
// ---------------------------------------------------------------------------

export async function saveGuidedProfile(
  userId: string,
  metrics: PhysicalMetrics,
  formula: GlobalSettings["tdeeFormula"]
) {
  const macroTargets = calcMacros(metrics, formula);
  return updateUser(userId, {
    metrics,
    macroTargets,
    planningMode: "guided",
    onboardingComplete: true,
  });
}

export async function saveManualProfile(
  userId: string,
  metrics: PhysicalMetrics,
  macroTargets: MacroTargets
) {
  return updateUser(userId, {
    metrics,
    macroTargets,
    planningMode: "manual",
    onboardingComplete: true,
  });
}

export async function setPlanningMode(userId: string, mode: PlanningMode) {
  return updateUser(userId, { planningMode: mode });
}

// ---------------------------------------------------------------------------
// Food log
// ---------------------------------------------------------------------------

export async function logFood(entry: Omit<FoodEntry, "id" | "createdAt">) {
  return addFoodEntry(entry);
}

export async function logFoodsBatch(
  userId: string,
  date: string,
  foods: Array<Omit<FoodEntry, "id" | "createdAt" | "userId" | "date">>
): Promise<void> {
  for (const food of foods) {
    addFoodEntry({ ...food, userId, date });
  }
}

export async function removeFood(id: string) {
  deleteFoodEntry(id);
}

export async function clearFoodLogForDate(userId: string, date: string) {
  deleteFoodEntriesForDate(userId, date);
}

// ---------------------------------------------------------------------------
// Water log
// ---------------------------------------------------------------------------

export async function logWater(userId: string, date: string, amountMl: number): Promise<WaterEntry> {
  return addWaterEntry({ userId, date, amountMl });
}

export async function removeWater(id: string): Promise<void> {
  deleteWaterEntry(id);
}

// ---------------------------------------------------------------------------
// Nutrition plans
// ---------------------------------------------------------------------------

export async function createNutritionPlan(
  userId: string,
  name: string,
  meals: NutritionPlanMeal[]
): Promise<NutritionPlan> {
  return addNutritionPlan({ userId, name, meals });
}

export async function editNutritionPlan(
  id: string,
  name: string,
  meals: NutritionPlanMeal[]
): Promise<NutritionPlan> {
  return updateNutritionPlan(id, { name, meals });
}

export async function removeNutritionPlan(id: string): Promise<void> {
  deleteNutritionPlan(id);
}

// ---------------------------------------------------------------------------
// Workout plans
// ---------------------------------------------------------------------------

export async function createWorkoutPlan(
  userId: string,
  name: string,
  days: WorkoutDay[]
) {
  return addWorkoutPlan({ userId, name, days });
}

export async function editWorkoutPlan(
  id: string,
  name: string,
  days: WorkoutDay[]
): Promise<WorkoutPlan> {
  return updateWorkoutPlan(id, { name, days });
}

export async function removeWorkoutPlan(id: string) {
  deleteWorkoutPlan(id);
}

// ---------------------------------------------------------------------------
// Workout log
// ---------------------------------------------------------------------------

export async function logWorkout(
  userId: string,
  exerciseName: string,
  sets: WorkoutSet[]
) {
  const entry: Omit<WorkoutLogEntry, "id"> = {
    userId,
    date: new Date().toISOString().split("T")[0],
    exerciseId: `e_${exerciseName.toLowerCase().replace(/\s+/g, "_")}`,
    exerciseName,
    sets,
  };
  return addWorkoutLogEntry(entry);
}

export async function removeWorkoutLogEntry(id: string) {
  deleteWorkoutLogEntry(id);
}

export async function clearWorkoutLogForDate(userId: string, date: string) {
  deleteWorkoutLogEntriesForDate(userId, date);
}

export async function updateWorkoutLogEntry(id: string, sets: WorkoutSet[]): Promise<WorkoutLogEntry | null> {
  return updateWorkoutLogEntryInStore(id, sets);
}

export async function logWorkoutsBatch(
  userId: string,
  entries: Array<{ exerciseName: string; sets: WorkoutSet[]; date: string }>
): Promise<void> {
  for (const { exerciseName, sets, date } of entries) {
    addWorkoutLogEntry({
      userId,
      date,
      exerciseId: `e_${exerciseName.toLowerCase().replace(/\s+/g, "_")}`,
      exerciseName,
      sets,
    });
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function updateGlobalSettings(patch: Partial<GlobalSettings>) {
  return updateSettings(patch);
}

// ---------------------------------------------------------------------------
// Read actions — all data reads route through here so client components
// always read from the server store, not the client-side seed copy.
// When the DB is added, replace the mock-store calls below with Prisma queries.
// ---------------------------------------------------------------------------

export async function fetchUser(userId: string): Promise<UserProfile | undefined> {
  return getUser(userId);
}

export async function fetchFoodLog(userId: string, date?: string): Promise<FoodEntry[]> {
  return getFoodLog(userId, date);
}

export async function fetchWaterLog(userId: string, date?: string): Promise<WaterEntry[]> {
  return getWaterLog(userId, date);
}

export async function fetchNutritionPlans(userId: string): Promise<NutritionPlan[]> {
  return getNutritionPlans(userId);
}

export async function fetchWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
  return getWorkoutPlans(userId);
}

export async function fetchWorkoutLog(userId: string, date?: string): Promise<WorkoutLogEntry[]> {
  return getWorkoutLog(userId, date);
}

export async function fetchSettings(): Promise<GlobalSettings> {
  return getSettings();
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  return getAllUsers();
}

