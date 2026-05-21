import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "crypto";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const hash = (pwd: string) => createHash("sha256").update(pwd).digest("hex");

const TODAY = new Date().toISOString().split("T")[0];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function main() {
  // Clear all tables in dependency order
  await prisma.workoutLogEntry.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.nutritionPlan.deleteMany();
  await prisma.waterEntry.deleteMany();
  await prisma.foodEntry.deleteMany();
  await prisma.globalSettings.deleteMany();
  await prisma.user.deleteMany();

  const member = await prisma.user.create({
    data: {
      id: "demo-user",
      email: "member@demo.com",
      username: "member",
      password: hash("member123"),
      role: "user",
      status: "approved",
      planningMode: "guided",
      onboardingComplete: true,
      weight: 75,
      height: 175,
      age: 28,
      biologicalSex: "male",
      activityLevel: "moderate",
      goal: "maintenance",
      targetCalories: 2500,
      targetProtein: 150,
      targetCarbs: 280,
      targetFat: 70,
    },
  });

  await prisma.user.create({
    data: {
      id: "demo-admin",
      email: "admin@demo.com",
      username: "admin",
      password: hash("admin123"),
      role: "admin",
      status: "approved",
      planningMode: "manual",
      onboardingComplete: true,
      weight: 80,
      height: 178,
      age: 32,
      activityLevel: "moderate",
      goal: "muscle_gain",
      targetCalories: 2800,
      targetProtein: 200,
      targetCarbs: 300,
      targetFat: 78,
    },
  });

  await prisma.foodEntry.createMany({
    data: [
      { id: "f1", userId: member.id, date: TODAY, name: "Oats with milk", calories: 350, protein: 14, carbs: 55, fat: 7, mealType: "breakfast" },
      { id: "f2", userId: member.id, date: TODAY, name: "Chicken breast", calories: 280, protein: 52, carbs: 0, fat: 6, mealType: "lunch" },
      { id: "f3", userId: member.id, date: TODAY, name: "Greek yogurt", calories: 100, protein: 10, carbs: 8, fat: 2, mealType: "snacks" },
      { id: "f4", userId: member.id, date: daysAgo(1), name: "Scrambled eggs", calories: 210, protein: 18, carbs: 2, fat: 14, mealType: "breakfast" },
      { id: "f5", userId: member.id, date: daysAgo(1), name: "Salmon fillet", calories: 280, protein: 34, carbs: 0, fat: 16, mealType: "dinner" },
      { id: "f6", userId: member.id, date: daysAgo(3), name: "Protein shake", calories: 120, protein: 25, carbs: 4, fat: 2, mealType: "breakfast" },
    ],
  });

  await prisma.waterEntry.createMany({
    data: [
      { id: "w1", userId: member.id, date: TODAY, amountMl: 500 },
      { id: "w2", userId: member.id, date: TODAY, amountMl: 300 },
      { id: "w3", userId: member.id, date: daysAgo(1), amountMl: 2000 },
      { id: "w4", userId: member.id, date: daysAgo(3), amountMl: 1500 },
    ],
  });

  await prisma.nutritionPlan.create({
    data: {
      id: "np1",
      userId: member.id,
      name: "Muscle Gain Day",
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
  });

  await prisma.workoutPlan.create({
    data: {
      id: "wp1",
      userId: member.id,
      name: "PPL Split",
      days: [
        { day: "Monday", exercises: ["Bench Press", "Overhead Press", "Tricep Pushdown"] },
        { day: "Wednesday", exercises: ["Deadlift", "Barbell Row", "Bicep Curl"] },
        { day: "Friday", exercises: ["Squat", "Leg Press", "Calf Raise"] },
      ],
    },
  });

  await prisma.workoutLogEntry.createMany({
    data: [
      { id: "wl1", userId: member.id, date: TODAY, exerciseId: "e_bench_press", exerciseName: "Bench Press", sets: [{ setNumber: 1, reps: 8, weight: 80 }, { setNumber: 2, reps: 8, weight: 82.5 }, { setNumber: 3, reps: 6, weight: 85 }] },
      { id: "wl2", userId: member.id, date: TODAY, exerciseId: "e_overhead_press", exerciseName: "Overhead Press", sets: [{ setNumber: 1, reps: 10, weight: 50 }, { setNumber: 2, reps: 8, weight: 52.5 }, { setNumber: 3, reps: 8, weight: 52.5 }] },
      { id: "wl3", userId: member.id, date: daysAgo(2), exerciseId: "e_deadlift", exerciseName: "Deadlift", sets: [{ setNumber: 1, reps: 5, weight: 120 }, { setNumber: 2, reps: 5, weight: 125 }, { setNumber: 3, reps: 3, weight: 130 }] },
      { id: "wl4", userId: member.id, date: daysAgo(2), exerciseId: "e_barbell_row", exerciseName: "Barbell Row", sets: [{ setNumber: 1, reps: 8, weight: 75 }, { setNumber: 2, reps: 8, weight: 77.5 }, { setNumber: 3, reps: 6, weight: 80 }] },
      { id: "wl5", userId: member.id, date: daysAgo(4), exerciseId: "e_squat", exerciseName: "Squat", sets: [{ setNumber: 1, reps: 6, weight: 100 }, { setNumber: 2, reps: 6, weight: 102.5 }, { setNumber: 3, reps: 5, weight: 105 }] },
      { id: "wl6", userId: member.id, date: daysAgo(4), exerciseId: "e_leg_press", exerciseName: "Leg Press", sets: [{ setNumber: 1, reps: 12, weight: 140 }, { setNumber: 2, reps: 10, weight: 150 }, { setNumber: 3, reps: 10, weight: 150 }] },
      { id: "wl7", userId: member.id, date: daysAgo(7), exerciseId: "e_bench_press", exerciseName: "Bench Press", sets: [{ setNumber: 1, reps: 8, weight: 77.5 }, { setNumber: 2, reps: 8, weight: 80 }, { setNumber: 3, reps: 6, weight: 82.5 }] },
    ],
  });

  await prisma.globalSettings.create({
    data: { id: "global", tdeeFormula: "mifflin_st_jeor" },
  });

  console.log("Database seeded successfully");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
