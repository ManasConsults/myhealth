import { ActivityLevel, MacroTargets, PhysicalMetrics, TDEEFormula } from "./types";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcBMR(metrics: PhysicalMetrics, formula: TDEEFormula): number {
  const { weight, height, age } = metrics;
  // Assuming male for demo; can be extended with sex field
  switch (formula) {
    case "harris_benedict":
      return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    case "katch_mcardle":
      // Requires lean body mass — estimate as 80% of weight
      return 370 + 21.6 * (weight * 0.8);
    case "mifflin_st_jeor":
    default:
      return 10 * weight + 6.25 * height - 5 * age + 5;
  }
}

export function calcTDEE(metrics: PhysicalMetrics, formula: TDEEFormula): number {
  const bmr = calcBMR(metrics, formula);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[metrics.activityLevel]);
}

export function calcMacros(metrics: PhysicalMetrics, formula: TDEEFormula): MacroTargets {
  const tdee = calcTDEE(metrics, formula);

  let calories: number;
  let proteinRatio: number;
  let fatRatio: number;

  switch (metrics.goal) {
    case "weight_loss":
      calories = Math.round(tdee * 0.8);
      proteinRatio = 0.35;
      fatRatio = 0.25;
      break;
    case "muscle_gain":
      calories = Math.round(tdee * 1.1);
      proteinRatio = 0.3;
      fatRatio = 0.25;
      break;
    case "maintenance":
    default:
      calories = tdee;
      proteinRatio = 0.25;
      fatRatio = 0.3;
  }

  const carbRatio = 1 - proteinRatio - fatRatio;
  return {
    calories,
    protein: Math.round((calories * proteinRatio) / 4),
    carbs: Math.round((calories * carbRatio) / 4),
    fat: Math.round((calories * fatRatio) / 9),
  };
}

export function calcMacroTotals(
  entries: { protein: number; carbs: number; fat: number; calories: number }[]
) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
