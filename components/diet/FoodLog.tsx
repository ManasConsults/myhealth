"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { clearFoodLogForDate, fetchFoodPortionSize, logFood, logFoodsBatch, logWater, removeFood, removeWater, searchFoods, updateFoodServing } from "@/lib/actions";
import {
  FOOD_UNIT_OPTIONS,
  FoodEntry,
  FoodSearchResult,
  FoodUnit,
  MacroTargets,
  MEAL_LABELS,
  MEAL_ORDER,
  MealType,
  NutritionPlan,
  VARIABLE_UNIT_DEFAULTS,
  WaterEntry,
  gramsFromUnit,
  isVariableUnit,
} from "@/lib/types";
import { BookOpen, ChevronLeft, ChevronRight, Droplets, Loader2, Plus, Search, Trash2, X } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const CAL_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WATER_TARGET_ML = 2500;
const QUICK_WATER = [200, 300, 500, 750] as const;

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  snacks: "🍎",
  dinner: "🌙",
};

const MACRO_COLORS = {
  protein: "text-blue-500",
  carbs: "text-amber-500",
  fat: "text-red-500",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function fmtWater(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  allEntries: FoodEntry[];
  waterLog: WaterEntry[];
  plans: NutritionPlan[];
  macroTargets: MacroTargets | null;
  onUpdate: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function FoodLog({ userId, allEntries, waterLog, plans, macroTargets, onUpdate }: Props) {
  const today = new Date().toISOString().split("T")[0];

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Add food dialog: null = closed, MealType = which meal
  const [addMeal, setAddMeal] = useState<MealType | null>(null);
  const [foodName, setFoodName] = useState("");
  const [foodCal, setFoodCal] = useState("");
  const [foodProtein, setFoodProtein] = useState("0");
  const [foodCarbs, setFoodCarbs] = useState("0");
  const [foodFat, setFoodFat] = useState("0");

  // Food search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [foodQty, setFoodQty] = useState("100");
  const [foodUnit, setFoodUnit] = useState<FoodUnit>("g");
  const [foodGramsPerUnit, setFoodGramsPerUnit] = useState("100");

  // Log from plan sheet
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");

  // Clear day confirmation
  const [confirmClear, setConfirmClear] = useState(false);

  // Water
  const [waterInput, setWaterInput] = useState("");

  const [isPending, startTransition] = useTransition();

  // ── Derived ────────────────────────────────────────────────────

  const filteredEntries = allEntries.filter((e) => e.date === selectedDate);
  const entriesByMeal = MEAL_ORDER.reduce<Record<MealType, FoodEntry[]>>((acc, m) => {
    acc[m] = filteredEntries.filter((e) => e.mealType === m);
    return acc;
  }, { breakfast: [], lunch: [], snacks: [], dinner: [] });

  const filteredWater = waterLog.filter((w) => w.date === selectedDate);
  const totalWaterMl = filteredWater.reduce((s, w) => s + w.amountMl, 0);

  const dayTotals = filteredEntries.reduce(
    (acc, e) => ({ calories: acc.calories + e.calories, protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const datesWithEntries = new Set(allEntries.map((e) => e.date));
  const datesWithWater = new Set(waterLog.map((w) => w.date));

  // ── Food search ────────────────────────────────────────────────

  const visibleResults = searchQuery.length >= 2 ? searchResults : [];

  useEffect(() => {
    if (searchQuery.length < 2) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchFoods(searchQuery);
      if (!cancelled) { setSearchResults(results); setIsSearching(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); setIsSearching(false); };
  }, [searchQuery]);

  function applyMacros(food: FoodSearchResult, qty: number, unit: FoodUnit, gpu: number) {
    const grams = gramsFromUnit(qty, unit, gpu);
    const factor = grams / 100;
    setFoodCal(String(Math.round(food.calories * factor)));
    setFoodProtein((food.protein * factor).toFixed(1));
    setFoodCarbs((food.carbs * factor).toFixed(1));
    setFoodFat((food.fat * factor).toFixed(1));
  }

  function selectFood(food: FoodSearchResult) {
    const unit = food.servingUnit as FoodUnit;
    const gpu = food.gramsPerServing;
    const initQty = unit === "g" ? gpu : 1;
    setSelectedFood(food);
    setFoodName(food.name);
    setFoodUnit(unit);
    setFoodGramsPerUnit(String(gpu));
    setFoodQty(String(initQty));
    applyMacros(food, initQty, unit, gpu);
    setSearchResults([]);
    setSearchQuery("");
  }

  // Fetch real portion size from USDA detail endpoint; only updates qty
  useEffect(() => {
    if (!selectedFood || foodUnit !== "g") return;
    let cancelled = false;
    fetchFoodPortionSize(selectedFood.fdcId).then((realGpu) => {
      if (cancelled || !realGpu) return;
      setFoodGramsPerUnit(String(realGpu));
      setFoodQty(String(realGpu));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFood?.fdcId]);

  // Recalculate macros whenever qty, unit, or selected food changes
  useEffect(() => {
    if (!selectedFood) return;
    const qty = parseFloat(foodQty);
    if (!qty || qty <= 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyMacros(selectedFood, qty, foodUnit, parseFloat(foodGramsPerUnit) || 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFood?.fdcId, foodQty, foodUnit, foodGramsPerUnit]);

  function handleQtyChange(qty: string) {
    setFoodQty(qty);
    if (!selectedFood || !qty) return;
    applyMacros(selectedFood, parseFloat(qty), foodUnit, parseFloat(foodGramsPerUnit));
  }

  function handleUnitChange(unit: FoodUnit) {
    setFoodUnit(unit);
    if (!selectedFood) return;
    const gpu = isVariableUnit(unit) ? (VARIABLE_UNIT_DEFAULTS[unit] ?? 100) : 100;
    setFoodGramsPerUnit(String(gpu));
    applyMacros(selectedFood, parseFloat(foodQty) || 1, unit, gpu);
  }


  // ── Add food ───────────────────────────────────────────────────

  function openAddDialog(meal: MealType) {
    setAddMeal(meal);
    setFoodName(""); setFoodCal(""); setFoodProtein("0"); setFoodCarbs("0"); setFoodFat("0");
    setSearchQuery(""); setSearchResults([]); setSelectedFood(null);
    setFoodQty("100"); setFoodUnit("g"); setFoodGramsPerUnit("100");
  }

  function closeAddDialog() {
    setAddMeal(null);
    setSearchQuery(""); setSearchResults([]); setSelectedFood(null);
    setFoodQty("100"); setFoodUnit("g"); setFoodGramsPerUnit("100");
  }

  function handleAddFood(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!addMeal) return;
    startTransition(async () => {
      if (selectedFood) {
        await updateFoodServing(selectedFood.fdcId, foodUnit, parseFloat(foodGramsPerUnit));
      }
      await logFood({
        userId,
        date: selectedDate,
        name: foodName,
        calories: parseInt(foodCal),
        protein: parseFloat(foodProtein),
        carbs: parseFloat(foodCarbs),
        fat: parseFloat(foodFat),
        mealType: addMeal,
      });
      closeAddDialog();
      onUpdate();
    });
  }

  function handleDeleteFood(id: string) {
    startTransition(async () => {
      await removeFood(id);
      onUpdate();
    });
  }

  function handleClearDay() {
    startTransition(async () => {
      await clearFoodLogForDate(userId, selectedDate);
      setConfirmClear(false);
      onUpdate();
    });
  }

  // ── Water ─────────────────────────────────────────────────────

  function handleAddWater(ml: number) {
    startTransition(async () => {
      await logWater(userId, selectedDate, ml);
      onUpdate();
    });
  }

  function handleCustomWater(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    const val = parseInt(waterInput);
    if (!val || val <= 0) return;
    startTransition(async () => {
      await logWater(userId, selectedDate, val);
      setWaterInput("");
      onUpdate();
    });
  }

  function handleDeleteWater(id: string) {
    startTransition(async () => {
      await removeWater(id);
      onUpdate();
    });
  }

  // ── Log from plan ──────────────────────────────────────────────

  function openPlanSheet() {
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
      setPlanOpen(true);
    }
  }

  function handleLogFromPlan(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;
    const foods = plan.meals.flatMap((m) =>
      m.foods.map((f) => ({
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        mealType: m.type,
      }))
    );
    startTransition(async () => {
      await logFoodsBatch(userId, selectedDate, foods);
      setPlanOpen(false);
      onUpdate();
    });
  }

  // ── Calendar ───────────────────────────────────────────────────

  const { year, month } = displayMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  function isoDate(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function goToToday() {
    setConfirmClear(false);
    const d = new Date();
    setSelectedDate(today);
    setDisplayMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  // ── Render ─────────────────────────────────────────────────────

  const selectedLabel = selectedDate === today ? "Today" : fmtDate(selectedDate);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">

      {/* ── Left: log ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">Food Log</h3>
            <p className="text-xs text-muted-foreground">{selectedLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {selectedDate !== today && (
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                Today
              </Button>
            )}
            {filteredEntries.length > 0 && (
              confirmClear ? (
                <>
                  <span className="text-xs text-muted-foreground">Clear all entries?</span>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setConfirmClear(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleClearDay} disabled={isPending}>
                    <Trash2 className="w-3 h-3" />Clear
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={() => setConfirmClear(true)}>
                  <Trash2 className="w-3 h-3" />Clear day
                </Button>
              )
            )}
            {plans.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openPlanSheet}>
                <BookOpen className="w-3.5 h-3.5" />Log from Plan
              </Button>
            )}
          </div>
        </div>

        {/* Macro summary */}
        {macroTargets && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Calories", consumed: dayTotals.calories, target: macroTargets.calories, unit: "kcal", cls: "text-foreground" },
              { label: "Protein", consumed: dayTotals.protein, target: macroTargets.protein, unit: "g", cls: MACRO_COLORS.protein },
              { label: "Carbs", consumed: dayTotals.carbs, target: macroTargets.carbs, unit: "g", cls: MACRO_COLORS.carbs },
              { label: "Fat", consumed: dayTotals.fat, target: macroTargets.fat, unit: "g", cls: MACRO_COLORS.fat },
            ].map((m) => {
              const pct = Math.min(100, Math.round((m.consumed / m.target) * 100));
              return (
                <div key={m.label} className="rounded-xl border bg-card px-3 py-2.5 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className={`text-xs font-semibold ${m.cls}`}>{m.consumed}<span className="font-normal text-muted-foreground">/{m.target}{m.unit}</span></p>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Meal sections */}
        <div className="space-y-3">
          {MEAL_ORDER.map((meal) => {
            const mealEntries = entriesByMeal[meal];
            const mealCal = mealEntries.reduce((s, e) => s + e.calories, 0);

            return (
              <div key={meal} className="rounded-xl border bg-card overflow-hidden">
                {/* Meal header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{MEAL_ICONS[meal]}</span>
                    <p className="text-sm font-semibold">{MEAL_LABELS[meal]}</p>
                    {mealCal > 0 && (
                      <Badge variant="secondary" className="text-xs font-normal">{mealCal} kcal</Badge>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openAddDialog(meal)}
                    disabled={isPending}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Food entries */}
                {mealEntries.length === 0 ? (
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground">Nothing logged yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {mealEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.calories} kcal
                            <span className={`ml-2 ${MACRO_COLORS.protein}`}>{entry.protein}g P</span>
                            <span className={`ml-1.5 ${MACRO_COLORS.carbs}`}>{entry.carbs}g C</span>
                            <span className={`ml-1.5 ${MACRO_COLORS.fat}`}>{entry.fat}g F</span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleDeleteFood(entry.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Water tracker */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-semibold">Water</p>
              <Badge variant="secondary" className="text-xs font-normal">
                {fmtWater(totalWaterMl)} / {fmtWater(WATER_TARGET_ML)}
              </Badge>
            </div>
          </div>
          <div className="px-4 py-3 space-y-3">
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all"
                style={{ width: `${Math.min(100, (totalWaterMl / WATER_TARGET_ML) * 100)}%` }}
              />
            </div>

            {/* Quick add */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_WATER.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => handleAddWater(ml)}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  +{fmtWater(ml)}
                </button>
              ))}
              <form onSubmit={handleCustomWater} className="flex gap-1">
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={waterInput}
                  onChange={(e) => setWaterInput(e.target.value)}
                  placeholder="ml"
                  className="h-7 w-16 text-xs px-2"
                />
                <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={isPending || !waterInput}>
                  Add
                </Button>
              </form>
            </div>

            {/* Today's water entries */}
            {filteredWater.length > 0 && (
              <div className="space-y-1">
                {filteredWater.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{fmtWater(entry.amountMl)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDeleteWater(entry.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: calendar ────────────────────────────────────── */}
      <div className="w-full lg:w-64 shrink-0">
        <Card>
          <CardContent className="pt-4 pb-4 px-3">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setDisplayMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold">{MONTH_NAMES[month]} {year}</span>
              <button
                onClick={() => setDisplayMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {CAL_LABELS.map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum = i - firstDayOfWeek + 1;
                const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                const dateStr = isValid ? isoDate(dayNum) : "";
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const hasFood = isValid && datesWithEntries.has(dateStr);
                const hasWater = isValid && datesWithWater.has(dateStr);
                return (
                  <div key={i} className="flex flex-col items-center py-0.5">
                    {isValid ? (
                      <button
                        onClick={() => { setSelectedDate(dateStr); setConfirmClear(false); }}
                        className={[
                          "relative w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary text-primary-foreground"
                            : isToday ? "ring-1 ring-primary text-primary"
                            : "hover:bg-muted text-foreground",
                        ].join(" ")}
                      >
                        {dayNum}
                        {(hasFood || hasWater) && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                            {hasFood && (
                              <span className={[
                                "w-1 h-1 rounded-full",
                                isSelected ? "bg-primary-foreground" : "bg-primary",
                              ].join(" ")} />
                            )}
                            {hasWater && (
                              <span className={[
                                "w-1 h-1 rounded-full",
                                isSelected ? "bg-primary-foreground" : "bg-blue-400",
                              ].join(" ")} />
                            )}
                          </span>
                        )}
                      </button>
                    ) : <div className="w-8 h-8" />}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t justify-center">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] text-muted-foreground">Food</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] text-muted-foreground">Water</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Add food dialog ─────────────────────────────────────── */}
      <Dialog open={addMeal !== null} onOpenChange={(o) => { if (!o) closeAddDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addMeal ? `${MEAL_ICONS[addMeal]} Add to ${MEAL_LABELS[addMeal]}` : "Add Food"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Search */}
            <div className="space-y-1.5">
              <Label>Search food database</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedFood(null); }}
                  placeholder="e.g. chicken breast, oats…"
                  className="pl-9 pr-9"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center -mr-3"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                ) : null}
              </div>

              {visibleResults.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden max-h-48 overflow-y-auto">
                  {visibleResults.map((food) => (
                    <button
                      key={food.fdcId}
                      type="button"
                      onClick={() => selectFood(food)}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0"
                    >
                      <p className="text-sm font-medium truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(food.calories)} kcal · {food.protein.toFixed(1)}g P · {food.carbs.toFixed(1)}g C · {food.fat.toFixed(1)}g F
                        <span className="ml-1 opacity-50">per 100g</span>
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Entry form */}
            <form onSubmit={handleAddFood} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Food Name</Label>
                <Input
                  value={foodName}
                  onChange={(e) => { setFoodName(e.target.value); if (selectedFood) setSelectedFood(null); }}
                  placeholder="e.g. Chicken breast"
                  required
                />
              </div>

              {selectedFood && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="space-y-1.5 flex-1">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={foodQty}
                        onChange={(e) => handleQtyChange(e.target.value)}
                        min={0.1}
                        step="any"
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-1.5 w-28">
                      <Label>Unit</Label>
                      <select
                        value={foodUnit}
                        onChange={(e) => handleUnitChange(e.target.value as FoodUnit)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {FOOD_UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Calories</Label>
                  <Input type="number" value={foodCal} onChange={(e) => setFoodCal(e.target.value)} min={0} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Protein (g)</Label>
                  <Input type="number" value={foodProtein} onChange={(e) => setFoodProtein(e.target.value)} min={0} step="0.1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Carbs (g)</Label>
                  <Input type="number" value={foodCarbs} onChange={(e) => setFoodCarbs(e.target.value)} min={0} step="0.1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fat (g)</Label>
                  <Input type="number" value={foodFat} onChange={(e) => setFoodFat(e.target.value)} min={0} step="0.1" />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding…" : "Add Entry"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Log from Plan sheet ─────────────────────────────────── */}
      <Sheet open={planOpen} onOpenChange={setPlanOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <SheetTitle>Log from Plan</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleLogFromPlan} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Plan selector */}
              {plans.length > 1 && (
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="flex gap-2 flex-wrap">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={[
                          "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                          plan.id === selectedPlanId
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/40",
                        ].join(" ")}
                      >
                        {plan.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Logging for */}
              <div className="rounded-xl bg-muted/50 px-4 py-2.5 text-sm">
                Logging for: <span className="font-semibold">{selectedLabel}</span>
              </div>

              <Separator />

              {/* Plan preview */}
              {selectedPlan ? (
                <div className="space-y-4">
                  {selectedPlan.meals.map((m) => {
                    const mCal = m.foods.reduce((s, f) => s + f.calories, 0);
                    return (
                      <div key={m.type} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{MEAL_ICONS[m.type]}</span>
                          <p className="text-sm font-semibold">{MEAL_LABELS[m.type]}</p>
                          <span className="text-xs text-muted-foreground">{mCal} kcal</span>
                        </div>
                        <div className="space-y-1 pl-6">
                          {m.foods.map((f, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <p className="text-xs text-foreground">{f.name}</p>
                              <span className="text-xs text-muted-foreground">{f.calories} kcal</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <Separator />

                  {/* Plan totals */}
                  {(() => {
                    const pt = selectedPlan.meals.flatMap((m) => m.foods).reduce(
                      (acc, f) => ({ calories: acc.calories + f.calories, protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat }),
                      { calories: 0, protein: 0, carbs: 0, fat: 0 }
                    );
                    return (
                      <div className="rounded-xl bg-muted/50 px-4 py-3 grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "Calories", val: pt.calories, unit: "kcal" },
                          { label: "Protein", val: pt.protein, unit: "g" },
                          { label: "Carbs", val: pt.carbs, unit: "g" },
                          { label: "Fat", val: pt.fat, unit: "g" },
                        ].map((s) => (
                          <div key={s.label}>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className="text-sm font-semibold">{s.val}<span className="text-xs font-normal">{s.unit}</span></p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No plan selected.</p>
              )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 px-5 py-4 border-t bg-popover">
              <Button type="submit" className="w-full" disabled={isPending || !selectedPlan}>
                {isPending ? "Logging…" : `Log ${selectedPlan?.meals.reduce((s, m) => s + m.foods.length, 0) ?? 0} items for ${selectedLabel}`}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
