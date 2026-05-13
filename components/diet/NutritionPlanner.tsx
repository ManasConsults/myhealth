"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createNutritionPlan, editNutritionPlan, fetchFoodPortionSize, removeNutritionPlan, searchFoods, updateFoodServing } from "@/lib/actions";
import {
  FOOD_UNIT_OPTIONS,
  FoodSearchResult,
  FoodUnit,
  MEAL_LABELS,
  MEAL_ORDER,
  MealType,
  NutritionPlan,
  NutritionPlanFood,
  NutritionPlanMeal,
  VARIABLE_UNIT_DEFAULTS,
  gramsFromUnit,
  isVariableUnit,
} from "@/lib/types";
import { Check, ChevronDown, ChevronUp, Loader2, Pencil, Plus, Salad, Search, Trash2, X } from "lucide-react";

// ── Food library ─────────────────────────────────────────────────────────────

type LibraryCategory = "Proteins" | "Carbs" | "Fats" | "Extras";

const FOOD_LIBRARY: Record<LibraryCategory, NutritionPlanFood[]> = {
  Proteins: [
    { name: "Chicken breast (100g)", calories: 165, protein: 31, carbs: 0, fat: 4 },
    { name: "Eggs (2 large)", calories: 143, protein: 13, carbs: 1, fat: 10 },
    { name: "Greek yogurt (200g)", calories: 100, protein: 10, carbs: 8, fat: 2 },
    { name: "Tuna (100g)", calories: 132, protein: 29, carbs: 0, fat: 1 },
    { name: "Salmon fillet (150g)", calories: 280, protein: 34, carbs: 0, fat: 16 },
    { name: "Protein shake", calories: 120, protein: 25, carbs: 4, fat: 2 },
    { name: "Cottage cheese (200g)", calories: 174, protein: 24, carbs: 6, fat: 5 },
    { name: "Ground beef (100g)", calories: 250, protein: 26, carbs: 0, fat: 17 },
  ],
  Carbs: [
    { name: "Oats with milk", calories: 350, protein: 14, carbs: 55, fat: 7 },
    { name: "Brown rice (150g)", calories: 165, protein: 4, carbs: 34, fat: 1 },
    { name: "White rice (150g)", calories: 195, protein: 4, carbs: 43, fat: 0 },
    { name: "Banana", calories: 89, protein: 1, carbs: 23, fat: 0 },
    { name: "Sweet potato (150g)", calories: 130, protein: 2, carbs: 30, fat: 0 },
    { name: "Whole wheat bread (2 slices)", calories: 180, protein: 8, carbs: 34, fat: 2 },
    { name: "Pasta (80g dry)", calories: 285, protein: 10, carbs: 56, fat: 1 },
    { name: "Apple", calories: 72, protein: 0, carbs: 19, fat: 0 },
  ],
  Fats: [
    { name: "Almonds (30g)", calories: 174, protein: 6, carbs: 6, fat: 15 },
    { name: "Mixed nuts (30g)", calories: 180, protein: 5, carbs: 6, fat: 16 },
    { name: "Avocado (half)", calories: 120, protein: 1, carbs: 6, fat: 11 },
    { name: "Olive oil (1 tbsp)", calories: 119, protein: 0, carbs: 0, fat: 14 },
    { name: "Peanut butter (2 tbsp)", calories: 188, protein: 8, carbs: 6, fat: 16 },
  ],
  Extras: [
    { name: "Milk (250ml)", calories: 122, protein: 8, carbs: 12, fat: 5 },
    { name: "Broccoli (150g)", calories: 45, protein: 4, carbs: 8, fat: 0 },
    { name: "Mixed vegetables (150g)", calories: 60, protein: 4, carbs: 10, fat: 0 },
    { name: "Salad (no dressing)", calories: 30, protein: 2, carbs: 5, fat: 0 },
    { name: "Orange juice (200ml)", calories: 88, protein: 1, carbs: 21, fat: 0 },
  ],
};

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  snacks: "🍎",
  dinner: "🌙",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  plans: NutritionPlan[];
  onUpdate: () => void;
}

type MealFoods = Record<MealType, NutritionPlanFood[]>;

function emptyMeals(): MealFoods {
  return { breakfast: [], lunch: [], snacks: [], dinner: [] };
}

function mealCalories(foods: NutritionPlanFood[]): number {
  return foods.reduce((s, f) => s + f.calories, 0);
}

function planTotals(meals: MealFoods) {
  const all = Object.values(meals).flat();
  return {
    calories: all.reduce((s, f) => s + f.calories, 0),
    protein: all.reduce((s, f) => s + f.protein, 0),
    carbs: all.reduce((s, f) => s + f.carbs, 0),
    fat: all.reduce((s, f) => s + f.fat, 0),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function NutritionPlanner({ userId, plans, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [planName, setPlanName] = useState("");
  const [meals, setMeals] = useState<MealFoods>(emptyMeals());
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>("Proteins");
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [customProtein, setCustomProtein] = useState("0");
  const [customCarbs, setCustomCarbs] = useState("0");
  const [customFat, setCustomFat] = useState("0");
  const [showCustom, setShowCustom] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // USDA search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingFood, setPendingFood] = useState<FoodSearchResult | null>(null);
  const [pendingFoodName, setPendingFoodName] = useState("");
  const [pendingQty, setPendingQty] = useState("100");
  const [pendingUnit, setPendingUnit] = useState<FoodUnit>("g");
  const [pendingGramsPerUnit, setPendingGramsPerUnit] = useState("100");

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchFoods(searchQuery);
      if (!cancelled) { setSearchResults(results); setIsSearching(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); setIsSearching(false); };
  }, [searchQuery]);

  function selectSearchResult(food: FoodSearchResult) {
    const unit = food.servingUnit as FoodUnit;
    const gpu = food.gramsPerServing;
    setPendingFood(food);
    setPendingFoodName(food.name);
    setPendingUnit(unit);
    setPendingGramsPerUnit(String(gpu));
    setPendingQty(unit === "g" ? String(gpu) : "1");
    setSearchQuery("");
    setSearchResults([]);
  }

  // Fetch real portion size from USDA detail endpoint after food is selected
  useEffect(() => {
    if (!pendingFood || pendingUnit !== "g") return;
    let cancelled = false;
    fetchFoodPortionSize(pendingFood.fdcId).then((realGpu) => {
      if (cancelled || !realGpu || realGpu === parseFloat(pendingGramsPerUnit)) return;
      setPendingGramsPerUnit(String(realGpu));
      setPendingQty(String(realGpu));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFood?.fdcId]);

  function confirmSearchFood() {
    if (!pendingFood) return;
    const grams = gramsFromUnit(parseFloat(pendingQty) || 1, pendingUnit, parseFloat(pendingGramsPerUnit));
    const factor = grams / 100;
    setMeals((prev) => ({
      ...prev,
      [selectedMeal]: [...prev[selectedMeal], {
        name: pendingFoodName.trim() || pendingFood.name,
        calories: Math.round(pendingFood.calories * factor),
        protein: parseFloat((pendingFood.protein * factor).toFixed(1)),
        carbs: parseFloat((pendingFood.carbs * factor).toFixed(1)),
        fat: parseFloat((pendingFood.fat * factor).toFixed(1)),
      }],
    }));
    updateFoodServing(pendingFood.fdcId, pendingUnit, parseFloat(pendingGramsPerUnit));
    setPendingFood(null);
    setPendingFoodName("");
    setPendingQty("100");
    setPendingUnit("g");
    setPendingGramsPerUnit("100");
  }

  function cancelSearchFood() {
    setPendingFood(null);
    setPendingFoodName("");
    setPendingQty("100");
    setPendingUnit("g");
    setPendingGramsPerUnit("100");
  }

  function resetSheetState() {
    setPlanName("");
    setMeals(emptyMeals());
    setSelectedMeal("breakfast");
    setActiveCategory("Proteins");
    setCustomName(""); setCustomCal(""); setCustomProtein("0"); setCustomCarbs("0"); setCustomFat("0");
    setShowCustom(false);
    setSearchQuery(""); setSearchResults([]); setPendingFood(null); setPendingFoodName(""); setPendingQty("100"); setPendingUnit("g"); setPendingGramsPerUnit("100");
  }

  function openSheet() {
    resetSheetState();
    setEditingPlanId(null);
    setOpen(true);
  }

  function openEditSheet(plan: NutritionPlan) {
    const mealFoods = emptyMeals();
    for (const m of plan.meals) {
      mealFoods[m.type] = [...m.foods];
    }
    setPlanName(plan.name);
    setMeals(mealFoods);
    setSelectedMeal("breakfast");
    setActiveCategory("Proteins");
    setCustomName(""); setCustomCal(""); setCustomProtein("0"); setCustomCarbs("0"); setCustomFat("0");
    setShowCustom(false);
    setEditingPlanId(plan.id);
    setOpen(true);
  }

  function toggleLibraryFood(food: NutritionPlanFood) {
    setMeals((prev) => {
      const cur = prev[selectedMeal];
      const exists = cur.some((f) => f.name === food.name);
      return {
        ...prev,
        [selectedMeal]: exists ? cur.filter((f) => f.name !== food.name) : [...cur, food],
      };
    });
  }

  function addCustomFood(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    const food: NutritionPlanFood = {
      name: customName.trim(),
      calories: parseInt(customCal) || 0,
      protein: parseFloat(customProtein) || 0,
      carbs: parseFloat(customCarbs) || 0,
      fat: parseFloat(customFat) || 0,
    };
    setMeals((prev) => ({ ...prev, [selectedMeal]: [...prev[selectedMeal], food] }));
    setCustomName(""); setCustomCal(""); setCustomProtein("0"); setCustomCarbs("0"); setCustomFat("0");
    setShowCustom(false);
  }

  function removeFoodFromMeal(meal: MealType, idx: number) {
    setMeals((prev) => ({ ...prev, [meal]: prev[meal].filter((_, i) => i !== idx) }));
  }

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    const planMeals: NutritionPlanMeal[] = MEAL_ORDER
      .filter((m) => meals[m].length > 0)
      .map((m) => ({ type: m, foods: meals[m] }));
    startTransition(async () => {
      if (editingPlanId) {
        await editNutritionPlan(editingPlanId, planName, planMeals);
      } else {
        await createNutritionPlan(userId, planName, planMeals);
      }
      setOpen(false);
      onUpdate();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await removeNutritionPlan(id);
      onUpdate();
    });
  }

  const selectedFoods = meals[selectedMeal];
  const totals = planTotals(meals);
  const totalFoods = Object.values(meals).reduce((s, f) => s + f.length, 0);
  const isEditing = editingPlanId !== null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Nutrition Plans</h3>
        <Button size="sm" className="gap-1.5" onClick={openSheet}>
          <Plus className="w-4 h-4" />New Plan
        </Button>
      </div>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
            <SheetTitle>{isEditing ? "Edit Plan" : "New Nutrition Plan"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* Plan name */}
              <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Muscle Gain Day, Cut Day"
                  required
                />
              </div>

              {/* Meal tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Meals</Label>
                  {totalFoods > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {totals.calories} kcal · {totals.protein}g P · {totals.carbs}g C · {totals.fat}g F
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {MEAL_ORDER.map((meal) => {
                    const count = meals[meal].length;
                    const cal = mealCalories(meals[meal]);
                    return (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => setSelectedMeal(meal)}
                        className={[
                          "flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                          selectedMeal === meal
                            ? "bg-primary text-primary-foreground shadow-sm scale-105"
                            : count > 0
                            ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                            : "bg-muted text-muted-foreground hover:bg-muted/70",
                        ].join(" ")}
                      >
                        <span className="text-base leading-none">{MEAL_ICONS[meal]}</span>
                        <span className="mt-0.5">{MEAL_LABELS[meal].slice(0, 5)}</span>
                        <span className={[
                          "text-[9px] font-medium leading-none",
                          selectedMeal === meal ? "text-primary-foreground/70" : count > 0 ? "text-primary/60" : "text-muted-foreground/60",
                        ].join(" ")}>
                          {count > 0 ? `${cal}kcal` : "empty"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal editor */}
              <div className="rounded-xl border bg-muted/30 overflow-hidden">
                {/* Meal header */}
                <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
                  <div>
                    <p className="text-sm font-semibold">{MEAL_ICONS[selectedMeal]} {MEAL_LABELS[selectedMeal]}</p>
                    <p className="text-xs text-muted-foreground leading-none mt-0.5">
                      {selectedFoods.length} item{selectedFoods.length !== 1 ? "s" : ""}
                      {selectedFoods.length > 0 && ` · ${mealCalories(selectedFoods)} kcal`}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Selected foods */}
                  {selectedFoods.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedFoods.map((food, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg bg-card border px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{food.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFoodFromMeal(selectedMeal, idx)}
                            className="w-5 h-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Pick foods from the library below
                    </p>
                  )}

                  <Separator />

                  {/* USDA food search */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); cancelSearchFood(); }}
                        placeholder="Search food database…"
                        className="pl-8 pr-8 h-9 text-sm"
                      />
                      {isSearching ? (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      ) : searchQuery ? (
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-8 min-h-8 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      ) : null}
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                      <div className="rounded-lg border bg-card overflow-hidden max-h-44 overflow-y-auto">
                        {searchResults.map((food) => (
                          <button
                            key={food.fdcId}
                            type="button"
                            onClick={() => selectSearchResult(food)}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
                          >
                            <p className="text-xs font-medium truncate">{food.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {Math.round(food.calories)} kcal · {food.protein.toFixed(1)}g P · {food.carbs.toFixed(1)}g C · {food.fat.toFixed(1)}g F
                              <span className="ml-1 opacity-50">per 100g</span>
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Pending food — quantity & name confirmation */}
                    {pendingFood && (
                      <div className="rounded-lg border bg-card p-3 space-y-2.5">
                        <Input
                          value={pendingFoodName}
                          onChange={(e) => setPendingFoodName(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Food name"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0.1}
                            step="any"
                            value={pendingQty}
                            onChange={(e) => setPendingQty(e.target.value)}
                            className="h-7 text-xs w-16"
                          />
                          <select
                            value={pendingUnit}
                            onChange={(e) => {
                              const u = e.target.value as FoodUnit;
                              setPendingUnit(u);
                              if (isVariableUnit(u)) setPendingGramsPerUnit(String(VARIABLE_UNIT_DEFAULTS[u] ?? 100));
                            }}
                            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {FOOD_UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        {(() => {
                          const grams = gramsFromUnit(parseFloat(pendingQty || "0"), pendingUnit, parseFloat(pendingGramsPerUnit));
                          const f = grams / 100;
                          return (
                            <div className="flex gap-3 text-[10px] font-medium px-0.5">
                              <span className="text-foreground">{Math.round(pendingFood.calories * f)} kcal</span>
                              <span className="text-blue-500">{(pendingFood.protein * f).toFixed(1)}g P</span>
                              <span className="text-amber-500">{(pendingFood.carbs * f).toFixed(1)}g C</span>
                              <span className="text-red-500">{(pendingFood.fat * f).toFixed(1)}g F</span>
                            </div>
                          );
                        })()}
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={confirmSearchFood}
                            disabled={!pendingQty || parseFloat(pendingQty) <= 0}
                          >
                            Add to {MEAL_LABELS[selectedMeal]}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={cancelSearchFood}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick-pick library — hidden while search is active */}
                  {!searchQuery && !pendingFood && (
                    <div className="space-y-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {(Object.keys(FOOD_LIBRARY) as LibraryCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            className={[
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                              activeCategory === cat
                                ? "bg-foreground text-background border-foreground"
                                : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
                            ].join(" ")}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {FOOD_LIBRARY[activeCategory].map((food) => {
                          const picked = selectedFoods.some((f) => f.name === food.name);
                          return (
                            <button
                              key={food.name}
                              type="button"
                              onClick={() => toggleLibraryFood(food)}
                              className={[
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                picked
                                  ? "bg-primary/10 text-primary border-primary/40 shadow-sm"
                                  : "bg-background text-foreground border-border hover:border-primary/30 hover:bg-primary/5",
                              ].join(" ")}
                            >
                              {picked && <Check className="w-3 h-3 shrink-0" />}
                              <span>{food.name}</span>
                              <span className="text-[10px] opacity-60">{food.calories}kcal</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Custom food */}
                  {showCustom ? (
                    <form onSubmit={addCustomFood} className="space-y-3">
                      <div className="space-y-1.5">
                        <Input
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Food name"
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Calories</Label>
                          <Input type="number" min={0} value={customCal} onChange={(e) => setCustomCal(e.target.value)} className="h-8 text-sm" required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Protein (g)</Label>
                          <Input type="number" min={0} step="0.1" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Carbs (g)</Label>
                          <Input type="number" min={0} step="0.1" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fat (g)</Label>
                          <Input type="number" min={0} step="0.1" value={customFat} onChange={(e) => setCustomFat(e.target.value)} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="flex-1">Add Food</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowCustom(false)}>Cancel</Button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustom(true)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3 h-3" />Add custom food
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 px-5 py-4 border-t bg-popover">
              <Button
                type="submit"
                className="w-full"
                disabled={isPending || !planName.trim() || totalFoods === 0}
              >
                {isPending
                  ? (isEditing ? "Saving…" : "Creating…")
                  : (isEditing ? "Save Changes" : "Create Plan")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Plan list */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Salad className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">No nutrition plans yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build a plan to template your daily meals
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={openSheet}>
            <Plus className="w-3.5 h-3.5" />Create your first plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan) => {
            const isExpanded = expandedPlan === plan.id;
            const pt = plan.meals.reduce(
              (acc, m) => {
                m.foods.forEach((f) => {
                  acc.calories += f.calories;
                  acc.protein += f.protein;
                  acc.carbs += f.carbs;
                  acc.fat += f.fat;
                });
                return acc;
              },
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            return (
              <Card key={plan.id}>
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm leading-tight">{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.meals.length} meal{plan.meals.length !== 1 ? "s" : ""} ·{" "}
                        {pt.calories} kcal · {pt.protein}g P · {pt.carbs}g C · {pt.fat}g F
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditSheet(plan)}
                        disabled={isPending}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(plan.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Meal strip */}
                  <div className="flex gap-1 mt-3">
                    {MEAL_ORDER.map((meal) => {
                      const pm = plan.meals.find((m) => m.type === meal);
                      return (
                        <div
                          key={meal}
                          title={MEAL_LABELS[meal]}
                          className={[
                            "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors",
                            pm ? "bg-primary" : "bg-muted",
                          ].join(" ")}
                        >
                          <span className={[
                            "text-[10px] leading-none",
                            pm ? "text-primary-foreground/90" : "text-muted-foreground/50",
                          ].join(" ")}>
                            {MEAL_LABELS[meal][0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pb-4 pt-0">
                    <Separator className="mb-3" />
                    <div className="space-y-4">
                      {plan.meals.map((m) => (
                        <div key={m.type} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <p className="text-xs font-semibold">{MEAL_ICONS[m.type]} {MEAL_LABELS[m.type]}</p>
                            <span className="text-xs text-muted-foreground">
                              {mealCalories(m.foods)} kcal
                            </span>
                          </div>
                          <div className="pl-3.5 space-y-0.5">
                            {m.foods.map((f, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <p className="text-xs text-foreground flex-1 min-w-0 truncate">{f.name}</p>
                                <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                                  {f.calories} kcal
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
