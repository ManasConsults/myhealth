"use client";

import { useMemo } from "react";
import { calcMacros, calcMacroTotals, calcTDEE } from "@/lib/calculations";
import { FoodEntry, MacroTargets, PhysicalMetrics, TDEEFormula } from "@/lib/types";

export function useGuidedMacros(
  metrics: PhysicalMetrics | null,
  formula: TDEEFormula
): MacroTargets | null {
  return useMemo(() => {
    if (!metrics) return null;
    return calcMacros(metrics, formula);
  }, [metrics, formula]);
}

export function useTDEE(
  metrics: PhysicalMetrics | null,
  formula: TDEEFormula
): number | null {
  return useMemo(() => {
    if (!metrics) return null;
    return calcTDEE(metrics, formula);
  }, [metrics, formula]);
}

export function useDailyTotals(entries: FoodEntry[]) {
  return useMemo(() => calcMacroTotals(entries), [entries]);
}

export function useRemainingMacros(
  targets: MacroTargets | null,
  totals: { calories: number; protein: number; carbs: number; fat: number }
) {
  return useMemo(() => {
    if (!targets) return null;
    return {
      calories: Math.max(0, targets.calories - totals.calories),
      protein: Math.max(0, targets.protein - totals.protein),
      carbs: Math.max(0, targets.carbs - totals.carbs),
      fat: Math.max(0, targets.fat - totals.fat),
    };
  }, [targets, totals]);
}
