import {
  FoodEntry,
  GlobalSettings,
  NutritionPlan,
  UserProfile,
  WaterEntry,
  WorkoutLogEntry,
  WorkoutPlan,
  WorkoutSet,
} from "./types";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

// Passwords are stored here only — UserProfile intentionally has no password field
const CREDENTIALS: Record<string, { userId: string; password: string }> = {
  member: { userId: "demo-user", password: "member123" },
  admin: { userId: "demo-admin", password: "admin123" },
};

const SEED_USERS: UserProfile[] = [
  {
    id: "demo-user",
    username: "member",
    role: "user",
    planningMode: "guided",
    onboardingComplete: false,
    metrics: null,
    macroTargets: null,
  },
  {
    id: "demo-admin",
    username: "admin",
    role: "admin",
    planningMode: "manual",
    onboardingComplete: true,
    metrics: {
      weight: 80,
      height: 178,
      age: 32,
      activityLevel: "moderate",
      goal: "muscle_gain",
    },
    macroTargets: {
      calories: 2800,
      protein: 200,
      carbs: 300,
      fat: 78,
    },
  },
];

const TODAY = new Date().toISOString().split("T")[0];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

const SEED_FOOD: FoodEntry[] = [
  {
    id: "f1",
    userId: "demo-user",
    date: TODAY,
    name: "Oats with milk",
    calories: 350,
    protein: 14,
    carbs: 55,
    fat: 7,
    mealType: "breakfast",
    createdAt: new Date().toISOString(),
  },
  {
    id: "f2",
    userId: "demo-user",
    date: TODAY,
    name: "Chicken breast",
    calories: 280,
    protein: 52,
    carbs: 0,
    fat: 6,
    mealType: "lunch",
    createdAt: new Date().toISOString(),
  },
  {
    id: "f3",
    userId: "demo-user",
    date: TODAY,
    name: "Greek yogurt",
    calories: 100,
    protein: 10,
    carbs: 8,
    fat: 2,
    mealType: "snacks",
    createdAt: new Date().toISOString(),
  },
  {
    id: "f4",
    userId: "demo-user",
    date: daysAgo(1),
    name: "Scrambled eggs",
    calories: 210,
    protein: 18,
    carbs: 2,
    fat: 14,
    mealType: "breakfast",
    createdAt: new Date().toISOString(),
  },
  {
    id: "f5",
    userId: "demo-user",
    date: daysAgo(1),
    name: "Salmon fillet",
    calories: 280,
    protein: 34,
    carbs: 0,
    fat: 16,
    mealType: "dinner",
    createdAt: new Date().toISOString(),
  },
  {
    id: "f6",
    userId: "demo-user",
    date: daysAgo(3),
    name: "Protein shake",
    calories: 120,
    protein: 25,
    carbs: 4,
    fat: 2,
    mealType: "breakfast",
    createdAt: new Date().toISOString(),
  },
];

const SEED_WATER: WaterEntry[] = [
  {
    id: "w1",
    userId: "demo-user",
    date: TODAY,
    amountMl: 500,
    createdAt: new Date().toISOString(),
  },
  {
    id: "w2",
    userId: "demo-user",
    date: TODAY,
    amountMl: 300,
    createdAt: new Date().toISOString(),
  },
  {
    id: "w3",
    userId: "demo-user",
    date: daysAgo(1),
    amountMl: 2000,
    createdAt: new Date().toISOString(),
  },
  {
    id: "w4",
    userId: "demo-user",
    date: daysAgo(3),
    amountMl: 1500,
    createdAt: new Date().toISOString(),
  },
];

const SEED_NUTRITION_PLANS: NutritionPlan[] = [
  {
    id: "np1",
    userId: "demo-user",
    name: "Muscle Gain Day",
    createdAt: new Date().toISOString(),
    meals: [
      {
        type: "breakfast",
        foods: [
          { name: "Oats with milk", calories: 350, protein: 14, carbs: 55, fat: 7 },
          { name: "Banana", calories: 89, protein: 1, carbs: 23, fat: 0 },
        ],
      },
      {
        type: "lunch",
        foods: [
          { name: "Chicken breast (200g)", calories: 330, protein: 62, carbs: 0, fat: 8 },
          { name: "Brown rice (150g)", calories: 165, protein: 4, carbs: 34, fat: 1 },
          { name: "Mixed vegetables", calories: 60, protein: 4, carbs: 10, fat: 0 },
        ],
      },
      {
        type: "snacks",
        foods: [
          { name: "Greek yogurt", calories: 100, protein: 10, carbs: 8, fat: 2 },
          { name: "Almonds (30g)", calories: 174, protein: 6, carbs: 6, fat: 15 },
        ],
      },
      {
        type: "dinner",
        foods: [
          { name: "Salmon fillet (150g)", calories: 280, protein: 34, carbs: 0, fat: 16 },
          { name: "Sweet potato (150g)", calories: 130, protein: 2, carbs: 30, fat: 0 },
          { name: "Broccoli (150g)", calories: 45, protein: 4, carbs: 8, fat: 0 },
        ],
      },
    ],
  },
];

const SEED_WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: "wp1",
    userId: "demo-user",
    name: "PPL Split",
    createdAt: new Date().toISOString(),
    days: [
      { day: "Monday", exercises: ["Bench Press", "Overhead Press", "Tricep Pushdown"] },
      { day: "Wednesday", exercises: ["Deadlift", "Barbell Row", "Bicep Curl"] },
      { day: "Friday", exercises: ["Squat", "Leg Press", "Calf Raise"] },
    ],
  },
];

const SEED_WORKOUT_LOG: WorkoutLogEntry[] = [
  {
    id: "wl1",
    userId: "demo-user",
    date: TODAY,
    exerciseId: "e_bench_press",
    exerciseName: "Bench Press",
    sets: [
      { setNumber: 1, reps: 8, weight: 80 },
      { setNumber: 2, reps: 8, weight: 82.5 },
      { setNumber: 3, reps: 6, weight: 85 },
    ],
  },
  {
    id: "wl2",
    userId: "demo-user",
    date: TODAY,
    exerciseId: "e_overhead_press",
    exerciseName: "Overhead Press",
    sets: [
      { setNumber: 1, reps: 10, weight: 50 },
      { setNumber: 2, reps: 8, weight: 52.5 },
      { setNumber: 3, reps: 8, weight: 52.5 },
    ],
  },
  {
    id: "wl3",
    userId: "demo-user",
    date: daysAgo(2),
    exerciseId: "e_deadlift",
    exerciseName: "Deadlift",
    sets: [
      { setNumber: 1, reps: 5, weight: 120 },
      { setNumber: 2, reps: 5, weight: 125 },
      { setNumber: 3, reps: 3, weight: 130 },
    ],
  },
  {
    id: "wl4",
    userId: "demo-user",
    date: daysAgo(2),
    exerciseId: "e_barbell_row",
    exerciseName: "Barbell Row",
    sets: [
      { setNumber: 1, reps: 8, weight: 75 },
      { setNumber: 2, reps: 8, weight: 77.5 },
      { setNumber: 3, reps: 6, weight: 80 },
    ],
  },
  {
    id: "wl5",
    userId: "demo-user",
    date: daysAgo(4),
    exerciseId: "e_squat",
    exerciseName: "Squat",
    sets: [
      { setNumber: 1, reps: 6, weight: 100 },
      { setNumber: 2, reps: 6, weight: 102.5 },
      { setNumber: 3, reps: 5, weight: 105 },
    ],
  },
  {
    id: "wl6",
    userId: "demo-user",
    date: daysAgo(4),
    exerciseId: "e_leg_press",
    exerciseName: "Leg Press",
    sets: [
      { setNumber: 1, reps: 12, weight: 140 },
      { setNumber: 2, reps: 10, weight: 150 },
      { setNumber: 3, reps: 10, weight: 150 },
    ],
  },
  {
    id: "wl7",
    userId: "demo-user",
    date: daysAgo(7),
    exerciseId: "e_bench_press",
    exerciseName: "Bench Press",
    sets: [
      { setNumber: 1, reps: 8, weight: 77.5 },
      { setNumber: 2, reps: 8, weight: 80 },
      { setNumber: 3, reps: 6, weight: 82.5 },
    ],
  },
];

const SEED_SETTINGS: GlobalSettings = {
  tdeeFormula: "mifflin_st_jeor",
};

// ---------------------------------------------------------------------------
// In-memory store — module-level singleton (survives hot reloads in dev via
// the globalThis trick)
// ---------------------------------------------------------------------------

interface Store {
  users: UserProfile[];
  foodLog: FoodEntry[];
  waterLog: WaterEntry[];
  nutritionPlans: NutritionPlan[];
  workoutPlans: WorkoutPlan[];
  workoutLog: WorkoutLogEntry[];
  settings: GlobalSettings;
}

function createStore(): Store {
  return {
    users: structuredClone(SEED_USERS),
    foodLog: structuredClone(SEED_FOOD),
    waterLog: structuredClone(SEED_WATER),
    nutritionPlans: structuredClone(SEED_NUTRITION_PLANS),
    workoutPlans: structuredClone(SEED_WORKOUT_PLANS),
    workoutLog: structuredClone(SEED_WORKOUT_LOG),
    settings: structuredClone(SEED_SETTINGS),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __myhealthStore: Store | undefined;
  // eslint-disable-next-line no-var
  var __myhealthIdSeq: number;
}

// Monotonically increasing counter — survives hot-reload via globalThis,
// guaranteeing unique IDs even when multiple entries are created in the same ms.
function nextId(prefix: string): string {
  globalThis.__myhealthIdSeq = (globalThis.__myhealthIdSeq ?? 0) + 1;
  return `${prefix}${Date.now()}_${globalThis.__myhealthIdSeq}`;
}

function isValidStore(s: unknown): s is Store {
  if (!s || typeof s !== "object") return false;
  const store = s as Record<string, unknown>;
  return (
    Array.isArray(store.users) &&
    Array.isArray(store.foodLog) &&
    Array.isArray(store.waterLog) &&
    Array.isArray(store.nutritionPlans) &&
    Array.isArray(store.workoutPlans) &&
    Array.isArray(store.workoutLog) &&
    store.settings != null
  );
}

function getStore(): Store {
  if (!isValidStore(globalThis.__myhealthStore)) {
    globalThis.__myhealthStore = createStore();
  }
  return globalThis.__myhealthStore;
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

export function validateLogin(username: string, password: string): UserProfile | undefined {
  const cred = CREDENTIALS[username];
  if (!cred || cred.password !== password) return undefined;
  return getStore().users.find((u) => u.id === cred.userId);
}

export function getUser(id: string): UserProfile | undefined {
  return getStore().users.find((u) => u.id === id);
}

export function getAllUsers(): UserProfile[] {
  return getStore().users;
}

export function updateUser(id: string, patch: Partial<UserProfile>): UserProfile {
  const store = getStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error(`User ${id} not found`);
  store.users[idx] = { ...store.users[idx], ...patch };
  return store.users[idx];
}

// ---------------------------------------------------------------------------
// Food log helpers
// ---------------------------------------------------------------------------

export function getFoodLog(userId: string, date?: string): FoodEntry[] {
  return getStore().foodLog.filter(
    (e) => e.userId === userId && (date ? e.date === date : true)
  );
}

export function addFoodEntry(entry: Omit<FoodEntry, "id" | "createdAt">): FoodEntry {
  const store = getStore();
  const newEntry: FoodEntry = {
    ...entry,
    id: nextId("f"),
    createdAt: new Date().toISOString(),
  };
  store.foodLog.push(newEntry);
  return newEntry;
}

export function deleteFoodEntry(id: string): void {
  const store = getStore();
  store.foodLog = store.foodLog.filter((e) => e.id !== id);
}

export function deleteFoodEntriesForDate(userId: string, date: string): void {
  const store = getStore();
  store.foodLog = store.foodLog.filter((e) => !(e.userId === userId && e.date === date));
}

// ---------------------------------------------------------------------------
// Water log helpers
// ---------------------------------------------------------------------------

export function getWaterLog(userId: string, date?: string): WaterEntry[] {
  return getStore().waterLog.filter(
    (e) => e.userId === userId && (date ? e.date === date : true)
  );
}

export function addWaterEntry(entry: Omit<WaterEntry, "id" | "createdAt">): WaterEntry {
  const store = getStore();
  const newEntry: WaterEntry = {
    ...entry,
    id: nextId("w"),
    createdAt: new Date().toISOString(),
  };
  store.waterLog.push(newEntry);
  return newEntry;
}

export function deleteWaterEntry(id: string): void {
  const store = getStore();
  store.waterLog = store.waterLog.filter((e) => e.id !== id);
}

// ---------------------------------------------------------------------------
// Nutrition plan helpers
// ---------------------------------------------------------------------------

export function getNutritionPlans(userId: string): NutritionPlan[] {
  return getStore().nutritionPlans.filter((p) => p.userId === userId);
}

export function addNutritionPlan(plan: Omit<NutritionPlan, "id" | "createdAt">): NutritionPlan {
  const store = getStore();
  const newPlan: NutritionPlan = {
    ...plan,
    id: nextId("np"),
    createdAt: new Date().toISOString(),
  };
  store.nutritionPlans.push(newPlan);
  return newPlan;
}

export function updateNutritionPlan(
  id: string,
  patch: Pick<NutritionPlan, "name" | "meals">
): NutritionPlan {
  const store = getStore();
  const idx = store.nutritionPlans.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Nutrition plan ${id} not found`);
  store.nutritionPlans[idx] = { ...store.nutritionPlans[idx], ...patch };
  return store.nutritionPlans[idx];
}

export function deleteNutritionPlan(id: string): void {
  const store = getStore();
  store.nutritionPlans = store.nutritionPlans.filter((p) => p.id !== id);
}

// ---------------------------------------------------------------------------
// Workout plan helpers
// ---------------------------------------------------------------------------

export function getWorkoutPlans(userId: string): WorkoutPlan[] {
  return getStore().workoutPlans.filter((p) => p.userId === userId);
}

export function addWorkoutPlan(plan: Omit<WorkoutPlan, "id" | "createdAt">): WorkoutPlan {
  const store = getStore();
  const newPlan: WorkoutPlan = {
    ...plan,
    id: nextId("wp"),
    createdAt: new Date().toISOString(),
  };
  store.workoutPlans.push(newPlan);
  return newPlan;
}

export function updateWorkoutPlan(
  id: string,
  patch: Pick<WorkoutPlan, "name" | "days">
): WorkoutPlan {
  const store = getStore();
  const idx = store.workoutPlans.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Workout plan ${id} not found`);
  store.workoutPlans[idx] = { ...store.workoutPlans[idx], ...patch };
  return store.workoutPlans[idx];
}

export function deleteWorkoutPlan(id: string): void {
  const store = getStore();
  store.workoutPlans = store.workoutPlans.filter((p) => p.id !== id);
}

// ---------------------------------------------------------------------------
// Workout log helpers
// ---------------------------------------------------------------------------

export function getWorkoutLog(userId: string, date?: string): WorkoutLogEntry[] {
  const store = getStore();
  return store.workoutLog.filter(
    (e) => e.userId === userId && (date ? e.date === date : true)
  );
}

export function addWorkoutLogEntry(
  entry: Omit<WorkoutLogEntry, "id">
): WorkoutLogEntry {
  const store = getStore();
  const newEntry: WorkoutLogEntry = { ...entry, id: nextId("wl") };
  store.workoutLog.push(newEntry);
  return newEntry;
}

export function deleteWorkoutLogEntry(id: string): void {
  const store = getStore();
  store.workoutLog = store.workoutLog.filter((e) => e.id !== id);
}

export function deleteWorkoutLogEntriesForDate(userId: string, date: string): void {
  const store = getStore();
  store.workoutLog = store.workoutLog.filter((e) => !(e.userId === userId && e.date === date));
}

export function updateWorkoutLogEntry(id: string, sets: WorkoutSet[]): WorkoutLogEntry | null {
  const store = getStore();
  const entry = store.workoutLog.find((e) => e.id === id);
  if (!entry) return null;
  entry.sets = sets;
  return { ...entry };
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

export function getSettings(): GlobalSettings {
  return getStore().settings;
}

export function updateSettings(patch: Partial<GlobalSettings>): GlobalSettings {
  const store = getStore();
  store.settings = { ...store.settings, ...patch };
  return store.settings;
}
