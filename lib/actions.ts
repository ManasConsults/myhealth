"use server";

import { createHash } from "crypto";
import { prisma } from "./db";
import { auth } from "@/auth";
import { calcMacros } from "./calculations";
import type {
  ActivityLevel,
  BiologicalSex,
  ExerciseLibrary,
  ExerciseType,
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  FoodEntry,
  FoodSearchResult,
  FoodUnit,
  GlobalSettings,
  Goal,
  MacroTargets,
  MealType,
  NutritionPlan,
  NutritionPlanMeal,
  PhysicalMetrics,
  PlanningMode,
  TDEEFormula,
  UserProfile,
  UserRole,
  UserStatus,
  WaterEntry,
  WorkoutDay,
  WorkoutLogEntry,
  WorkoutPlan,
  WorkoutSet,
} from "./types";
import type {
  Prisma,
  User as DbUser,
  FoodEntry as DbFoodEntry,
  WaterEntry as DbWaterEntry,
  NutritionPlan as DbNutritionPlan,
  WorkoutPlan as DbWorkoutPlan,
  WorkoutLogEntry as DbWorkoutLogEntry,
  ExerciseLibrary as DbExerciseLibrary,
  FoodCache as DbFoodCache,
  Feedback as DbFeedback,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Mappers — Prisma row → app type
// ---------------------------------------------------------------------------

function toUserProfile(u: DbUser): UserProfile {
  const hasMetrics =
    u.weight != null && u.height != null && u.age != null &&
    u.biologicalSex != null && u.activityLevel != null && u.goal != null;
  const hasMacros =
    u.targetCalories != null && u.targetProtein != null &&
    u.targetCarbs != null && u.targetFat != null;
  return {
    id: u.id,
    email: u.email ?? undefined,
    username: u.username,
    fullName: u.fullName ?? undefined,
    role: u.role as UserRole,
    status: u.status as UserStatus,
    planningMode: u.planningMode as PlanningMode,
    onboardingComplete: u.onboardingComplete,
    metrics: hasMetrics ? {
      weight: u.weight!,
      height: u.height!,
      age: u.age!,
      biologicalSex: u.biologicalSex as BiologicalSex,
      activityLevel: u.activityLevel as ActivityLevel,
      goal: u.goal as Goal,
    } : null,
    macroTargets: hasMacros ? {
      calories: u.targetCalories!,
      protein: u.targetProtein!,
      carbs: u.targetCarbs!,
      fat: u.targetFat!,
    } : null,
  };
}

function toFoodEntry(e: DbFoodEntry): FoodEntry {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date,
    name: e.name,
    calories: e.calories,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    mealType: e.mealType as MealType,
    createdAt: e.createdAt.toISOString(),
  };
}

function toWaterEntry(e: DbWaterEntry): WaterEntry {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date,
    amountMl: e.amountMl,
    createdAt: e.createdAt.toISOString(),
  };
}

function toNutritionPlan(p: DbNutritionPlan): NutritionPlan {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    meals: p.meals as unknown as NutritionPlanMeal[],
    createdAt: p.createdAt.toISOString(),
  };
}

function toExerciseLibrary(e: DbExerciseLibrary): ExerciseLibrary {
  return {
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    type: (e.type as ExerciseType) ?? undefined,
    instructions: e.instructions ?? undefined,
    createdAt: e.createdAt.toISOString(),
  };
}

function toWorkoutPlan(p: DbWorkoutPlan): WorkoutPlan {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    days: p.days as unknown as WorkoutDay[],
    createdAt: p.createdAt.toISOString(),
  };
}

function toWorkoutLogEntry(e: DbWorkoutLogEntry): WorkoutLogEntry {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date,
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    sets: e.sets as unknown as WorkoutSet[],
  };
}

// ---------------------------------------------------------------------------
// Authorization helper
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Forbidden");
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginUser(email: string, password: string): Promise<UserProfile | null> {
  const passwordHash = createHash("sha256").update(password).digest("hex");
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user || user.password !== passwordHash) return null;
  if (user.status !== "approved") return null;
  return toUserProfile(user);
}

// ---------------------------------------------------------------------------
// Profile / onboarding
// ---------------------------------------------------------------------------

export async function saveGuidedProfile(
  userId: string,
  metrics: PhysicalMetrics,
  formula: GlobalSettings["tdeeFormula"]
): Promise<UserProfile> {
  const macroTargets = calcMacros(metrics, formula);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      planningMode: "guided",
      onboardingComplete: true,
      weight: metrics.weight,
      height: metrics.height,
      age: metrics.age,
      biologicalSex: metrics.biologicalSex,
      activityLevel: metrics.activityLevel,
      goal: metrics.goal,
      targetCalories: macroTargets.calories,
      targetProtein: macroTargets.protein,
      targetCarbs: macroTargets.carbs,
      targetFat: macroTargets.fat,
    },
  });
  return toUserProfile(updated);
}

export async function saveManualProfile(
  userId: string,
  metrics: PhysicalMetrics,
  macroTargets: MacroTargets
): Promise<UserProfile> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      planningMode: "manual",
      onboardingComplete: true,
      weight: metrics.weight,
      height: metrics.height,
      age: metrics.age,
      biologicalSex: metrics.biologicalSex,
      activityLevel: metrics.activityLevel,
      goal: metrics.goal,
      targetCalories: macroTargets.calories,
      targetProtein: macroTargets.protein,
      targetCarbs: macroTargets.carbs,
      targetFat: macroTargets.fat,
    },
  });
  return toUserProfile(updated);
}

export async function setPlanningMode(userId: string, mode: PlanningMode): Promise<UserProfile> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { planningMode: mode },
  });
  return toUserProfile(updated);
}

export async function updateFullName(userId: string, fullName: string): Promise<UserProfile> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { fullName: fullName.trim() || null },
  });
  return toUserProfile(updated);
}

// ---------------------------------------------------------------------------
// Food log
// ---------------------------------------------------------------------------

export async function logFood(entry: Omit<FoodEntry, "id" | "createdAt">): Promise<FoodEntry> {
  const created = await prisma.foodEntry.create({
    data: {
      userId: entry.userId,
      date: entry.date,
      name: entry.name,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      mealType: entry.mealType,
    },
  });
  return toFoodEntry(created);
}

export async function logFoodsBatch(
  userId: string,
  date: string,
  foods: Array<Omit<FoodEntry, "id" | "createdAt" | "userId" | "date">>
): Promise<void> {
  await prisma.foodEntry.createMany({
    data: foods.map((f) => ({ userId, date, ...f })),
  });
}

export async function removeFood(id: string): Promise<void> {
  await prisma.foodEntry.delete({ where: { id } });
}

export async function clearFoodLogForDate(userId: string, date: string): Promise<void> {
  await prisma.foodEntry.deleteMany({ where: { userId, date } });
}

// ---------------------------------------------------------------------------
// Water log
// ---------------------------------------------------------------------------

export async function logWater(userId: string, date: string, amountMl: number): Promise<WaterEntry> {
  const created = await prisma.waterEntry.create({ data: { userId, date, amountMl } });
  return toWaterEntry(created);
}

export async function removeWater(id: string): Promise<void> {
  await prisma.waterEntry.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Nutrition plans
// ---------------------------------------------------------------------------

export async function createNutritionPlan(
  userId: string,
  name: string,
  meals: NutritionPlanMeal[]
): Promise<NutritionPlan> {
  const created = await prisma.nutritionPlan.create({ data: { userId, name, meals: meals as unknown as Prisma.InputJsonValue } });
  return toNutritionPlan(created);
}

export async function editNutritionPlan(
  id: string,
  name: string,
  meals: NutritionPlanMeal[]
): Promise<NutritionPlan> {
  const updated = await prisma.nutritionPlan.update({ where: { id }, data: { name, meals: meals as unknown as Prisma.InputJsonValue } });
  return toNutritionPlan(updated);
}

export async function removeNutritionPlan(id: string): Promise<void> {
  await prisma.nutritionPlan.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Workout plans
// ---------------------------------------------------------------------------

export async function createWorkoutPlan(
  userId: string,
  name: string,
  days: WorkoutDay[]
): Promise<WorkoutPlan> {
  const created = await prisma.workoutPlan.create({ data: { userId, name, days: days as unknown as Prisma.InputJsonValue } });
  return toWorkoutPlan(created);
}

export async function editWorkoutPlan(
  id: string,
  name: string,
  days: WorkoutDay[]
): Promise<WorkoutPlan> {
  const updated = await prisma.workoutPlan.update({ where: { id }, data: { name, days: days as unknown as Prisma.InputJsonValue } });
  return toWorkoutPlan(updated);
}

export async function removeWorkoutPlan(id: string): Promise<void> {
  await prisma.workoutPlan.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Workout log
// ---------------------------------------------------------------------------

export async function logWorkout(
  userId: string,
  exerciseName: string,
  sets: WorkoutSet[],
  date: string,
  type?: ExerciseType
): Promise<WorkoutLogEntry> {
  const lib = await prisma.exerciseLibrary.upsert({
    where: { name: exerciseName },
    update: type ? { type } : {},
    create: { name: exerciseName, ...(type ? { type } : {}) },
  });
  const created = await prisma.workoutLogEntry.create({
    data: {
      userId,
      date,
      exerciseId: `e_${exerciseName.toLowerCase().replace(/\s+/g, "_")}`,
      exerciseName,
      exerciseLibraryId: lib.id,
      sets: sets as unknown as Prisma.InputJsonValue,
    },
  });
  return toWorkoutLogEntry(created);
}

export async function removeWorkoutLogEntry(id: string): Promise<void> {
  await prisma.workoutLogEntry.delete({ where: { id } });
}

export async function clearWorkoutLogForDate(userId: string, date: string): Promise<void> {
  await prisma.workoutLogEntry.deleteMany({ where: { userId, date } });
}

export async function updateWorkoutLogEntry(id: string, sets: WorkoutSet[]): Promise<WorkoutLogEntry | null> {
  try {
    const updated = await prisma.workoutLogEntry.update({ where: { id }, data: { sets: sets as unknown as Prisma.InputJsonValue } });
    return toWorkoutLogEntry(updated);
  } catch {
    return null;
  }
}

export async function logWorkoutsBatch(
  userId: string,
  entries: Array<{ exerciseName: string; sets: WorkoutSet[]; date: string }>
): Promise<void> {
  // Upsert all unique exercise names into the library first
  const uniqueNames = [...new Set(entries.map((e) => e.exerciseName))];
  await prisma.exerciseLibrary.createMany({
    data: uniqueNames.map((name) => ({ name })),
    skipDuplicates: true,
  });
  const libRows = await prisma.exerciseLibrary.findMany({
    where: { name: { in: uniqueNames } },
    select: { id: true, name: true },
  });
  const libIdByName = Object.fromEntries(libRows.map((r) => [r.name, r.id]));
  await prisma.workoutLogEntry.createMany({
    data: entries.map(({ exerciseName, sets, date }) => ({
      userId,
      date,
      exerciseId: `e_${exerciseName.toLowerCase().replace(/\s+/g, "_")}`,
      exerciseName,
      exerciseLibraryId: libIdByName[exerciseName],
      sets: sets as unknown as Prisma.InputJsonValue,
    })),
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function updateGlobalSettings(patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
  await requireAdmin();
  const updated = await prisma.globalSettings.upsert({
    where: { id: "global" },
    update: patch,
    create: { id: "global", tdeeFormula: "mifflin_st_jeor", ...patch },
  });
  return { tdeeFormula: updated.tdeeFormula as TDEEFormula };
}

// ---------------------------------------------------------------------------
// Read actions
// ---------------------------------------------------------------------------

export async function fetchUser(userId: string): Promise<UserProfile | undefined> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toUserProfile(user) : undefined;
}

export async function fetchFoodLog(userId: string, date?: string): Promise<FoodEntry[]> {
  const entries = await prisma.foodEntry.findMany({
    where: { userId, ...(date ? { date } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return entries.map(toFoodEntry);
}

export async function fetchWaterLog(userId: string, date?: string): Promise<WaterEntry[]> {
  const entries = await prisma.waterEntry.findMany({
    where: { userId, ...(date ? { date } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return entries.map(toWaterEntry);
}

export async function fetchNutritionPlans(userId: string): Promise<NutritionPlan[]> {
  const plans = await prisma.nutritionPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return plans.map(toNutritionPlan);
}

export async function fetchWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
  const plans = await prisma.workoutPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return plans.map(toWorkoutPlan);
}

export async function fetchExerciseLibrary(): Promise<ExerciseLibrary[]> {
  const exercises = await prisma.exerciseLibrary.findMany({
    orderBy: { name: "asc" },
  });
  return exercises.map(toExerciseLibrary);
}

export async function upsertExerciseInLibrary(name: string, type?: ExerciseType): Promise<ExerciseLibrary> {
  const ex = await prisma.exerciseLibrary.upsert({
    where: { name },
    update: type ? { type } : {},
    create: { name, ...(type ? { type } : {}) },
  });
  return toExerciseLibrary(ex);
}

export async function createExerciseInLibrary(
  name: string,
  muscleGroup: string,
  type?: ExerciseType,
  instructions?: string,
): Promise<ExerciseLibrary> {
  await requireAdmin();
  const ex = await prisma.exerciseLibrary.create({
    data: { name, muscleGroup, ...(type ? { type } : {}), ...(instructions ? { instructions } : {}) },
  });
  return toExerciseLibrary(ex);
}

export async function updateExerciseInLibrary(
  id: string,
  data: { name?: string; muscleGroup?: string; type?: ExerciseType | null; instructions?: string | null },
): Promise<ExerciseLibrary> {
  await requireAdmin();
  const ex = await prisma.exerciseLibrary.update({ where: { id }, data });
  return toExerciseLibrary(ex);
}

export async function deleteExerciseFromLibrary(id: string): Promise<void> {
  await requireAdmin();
  await prisma.exerciseLibrary.delete({ where: { id } });
}

export async function fetchWorkoutLog(userId: string, date?: string): Promise<WorkoutLogEntry[]> {
  const entries = await prisma.workoutLogEntry.findMany({
    where: { userId, ...(date ? { date } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return entries.map(toWorkoutLogEntry);
}

export async function fetchSettings(): Promise<GlobalSettings> {
  const settings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
  return { tdeeFormula: (settings?.tdeeFormula ?? "mifflin_st_jeor") as TDEEFormula };
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map(toUserProfile);
}

// ---------------------------------------------------------------------------
// Registration & approval
// ---------------------------------------------------------------------------

export async function registerUser(
  email: string,
  password: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email address." };
  }
  const emailConflict = await prisma.user.findFirst({ where: { email } });
  if (emailConflict) return { success: false, error: "An account with this email already exists." };

  const username = name.trim().slice(0, 30);
  const usernameConflict = await prisma.user.findUnique({ where: { username } });
  if (usernameConflict) return { success: false, error: "This display name is already taken. Please choose another." };

  const passwordHash = createHash("sha256").update(password).digest("hex");
  await prisma.user.create({
    data: {
      email,
      username,
      password: passwordHash,
      role: "user",
      status: "pending",
      planningMode: "guided",
    },
  });
  return { success: true };
}

export async function approveUser(id: string): Promise<void> {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { status: "approved" } });
}

export async function rejectUser(id: string): Promise<void> {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { status: "rejected" } });
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { role } });
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<void> {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { status } });
}

// ---------------------------------------------------------------------------
// Food search — USDA FoodData Central with local DB cache
// ---------------------------------------------------------------------------

const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

interface UsdaNutrient {
  nutrientId: number;
  value: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string | null;
  foodNutrients: UsdaNutrient[];
}

interface UsdaFoodPortion {
  amount: number;
  gramWeight: number;
  sequenceNumber?: number;
}

interface UsdaFoodDetail {
  foodPortions?: UsdaFoodPortion[];
}

interface UsdaSearchResponse {
  foods?: UsdaFood[];
}

function toFoodSearchResult(c: DbFoodCache): FoodSearchResult {
  return {
    fdcId: c.fdcId,
    name: c.name,
    brand: c.brand ?? undefined,
    calories: c.calories,
    protein: c.protein,
    carbs: c.carbs,
    fat: c.fat,
    servingUnit: (c.servingUnit as FoodUnit) ?? "g",
    gramsPerServing: c.gramsPerServing ?? 100,
  };
}

function getNutrient(nutrients: UsdaNutrient[], id: number): number {
  return nutrients.find((n) => n.nutrientId === id)?.value ?? 0;
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cached = await prisma.foodCache.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  if (cached.length >= 5) return cached.map(toFoodSearchResult);

  const apiKey = process.env.USDA_API_KEY ?? "DEMO_KEY";
  const params = new URLSearchParams({
    query: q,
    pageSize: "10",
    // SR Legacy and Foundation foods have consistent per-100g macro data
    dataType: "SR Legacy,Foundation",
    api_key: apiKey,
  });

  try {
    const res = await fetch(`${USDA_BASE_URL}/foods/search?${params}`);
    if (!res.ok) return cached.map(toFoodSearchResult);

    const data = (await res.json()) as UsdaSearchResponse;
    const usdaFoods = data.foods ?? [];

    const newEntries = usdaFoods.map((food) => ({
      fdcId: food.fdcId,
      name: food.description,
      brand: food.brandOwner ?? null,
      calories: getNutrient(food.foodNutrients, 1008),
      protein: getNutrient(food.foodNutrients, 1003),
      carbs: getNutrient(food.foodNutrients, 1005),
      fat: getNutrient(food.foodNutrients, 1004),
      servingUnit: "g",
      gramsPerServing: 100,
    }));

    if (newEntries.length > 0) {
      await prisma.foodCache.createMany({ data: newEntries, skipDuplicates: true });
    }

    const cachedIds = new Set(cached.map((c) => c.fdcId));
    const merged: FoodSearchResult[] = [
      ...cached.map(toFoodSearchResult),
      ...newEntries
        .filter((e) => !cachedIds.has(e.fdcId))
        .map((e) => ({ ...e, brand: e.brand ?? undefined, servingUnit: "g" as FoodUnit })),
    ];
    return merged.slice(0, 10);
  } catch {
    return cached.map(toFoodSearchResult);
  }
}

export async function fetchFoodPortionSize(fdcId: number): Promise<number | null> {
  const cached = await prisma.foodCache.findUnique({ where: { fdcId } });
  if (cached && cached.gramsPerServing !== 100) return cached.gramsPerServing;

  const apiKey = process.env.USDA_API_KEY ?? "DEMO_KEY";
  try {
    const res = await fetch(`${USDA_BASE_URL}/food/${fdcId}?api_key=${apiKey}`);
    if (!res.ok) return null;
    const data = (await res.json()) as UsdaFoodDetail;
    const sorted = (data.foodPortions ?? [])
      .filter((p) => p.amount > 0 && p.gramWeight > 0)
      .sort((a, b) => (a.sequenceNumber ?? 99) - (b.sequenceNumber ?? 99));
    const portion = sorted[0];
    if (!portion) return null;
    const gramsPerServing = Math.round(portion.gramWeight / portion.amount);
    await prisma.foodCache.updateMany({ where: { fdcId }, data: { gramsPerServing } });
    return gramsPerServing;
  } catch {
    return null;
  }
}

export async function updateFoodServing(
  fdcId: number,
  servingUnit: FoodUnit,
  gramsPerServing: number,
): Promise<void> {
  await prisma.foodCache.update({
    where: { fdcId },
    data: { servingUnit, gramsPerServing },
  });
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

function toFeedback(f: DbFeedback & { user: { username: string } }): Feedback {
  return {
    id: f.id,
    userId: f.userId,
    username: f.user.username,
    title: f.title,
    category: f.category as FeedbackCategory,
    message: f.message,
    status: f.status as FeedbackStatus,
    adminNote: f.adminNote ?? undefined,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function submitFeedback(
  title: string,
  category: FeedbackCategory,
  message: string,
): Promise<Feedback> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  const row = await prisma.feedback.create({
    data: { userId, title, category, message },
    include: { user: { select: { username: true } } },
  });
  return toFeedback(row);
}

export async function fetchUserFeedback(): Promise<Feedback[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  const rows = await prisma.feedback.findMany({
    where: { userId },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toFeedback);
}

export async function fetchAllFeedback(): Promise<Feedback[]> {
  await requireAdmin();
  const rows = await prisma.feedback.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toFeedback);
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNote?: string,
): Promise<void> {
  await requireAdmin();
  await prisma.feedback.update({
    where: { id },
    data: { status, ...(adminNote !== undefined && { adminNote }) },
  });
}

export async function deleteFeedback(id: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  const row = await prisma.feedback.findUnique({ where: { id } });
  if (!row) return;
  const isAdmin = session?.user?.role === "admin";
  if (!isAdmin && row.userId !== userId) throw new Error("Forbidden");
  await prisma.feedback.delete({ where: { id } });
}
