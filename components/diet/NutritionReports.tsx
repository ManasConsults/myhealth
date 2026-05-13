"use client";

import { useMemo, useState } from "react";
import { FoodEntry, MacroTargets, WaterEntry } from "@/lib/types";
import { AlertCircle, Droplets } from "lucide-react";

const WATER_TARGET_ML = 2500;
const BAR_H = 80;
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Period = "week" | "month" | "year";

interface Props {
  allEntries: FoodEntry[];
  waterLog: WaterEntry[];
  macroTargets: MacroTargets | null;
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function buildFoodMap(entries: FoodEntry[]) {
  const map = new Map<string, { cal: number; pro: number; carbs: number; fat: number }>();
  for (const e of entries) {
    const v = map.get(e.date) ?? { cal: 0, pro: 0, carbs: 0, fat: 0 };
    map.set(e.date, {
      cal: v.cal + e.calories,
      pro: v.pro + e.protein,
      carbs: v.carbs + e.carbs,
      fat: v.fat + e.fat,
    });
  }
  return map;
}

function buildWaterMap(entries: WaterEntry[]) {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.date, (map.get(e.date) ?? 0) + e.amountMl);
  return map;
}

type FoodMap = ReturnType<typeof buildFoodMap>;
type WaterMap = ReturnType<typeof buildWaterMap>;

interface DayBar {
  date: string;
  label: string;
  cal: number;
  pro: number;
  carbs: number;
  fat: number;
  water: number;
  isPast: boolean;
  isToday: boolean;
}

interface MonthBar {
  key: string;
  label: string;
  avgCal: number;
  avgPro: number;
  avgCarbs: number;
  avgFat: number;
  avgWater: number;
  loggedDays: number;
  passedDays: number;
}

function getDayBars(period: "week" | "month", today: string, foodMap: FoodMap, waterMap: WaterMap): DayBar[] {
  const base = new Date(`${today}T00:00:00`);
  const dates: string[] = [];

  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
  } else {
    const y = base.getFullYear(), m = base.getMonth();
    for (let d = 1; d <= base.getDate(); d++) {
      dates.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }

  return dates.map((date) => {
    const food = foodMap.get(date);
    const d = new Date(`${date}T00:00:00`);
    const label = period === "week"
      ? ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]
      : String(d.getDate());
    return {
      date,
      label,
      cal: food?.cal ?? 0,
      pro: food?.pro ?? 0,
      carbs: food?.carbs ?? 0,
      fat: food?.fat ?? 0,
      water: waterMap.get(date) ?? 0,
      isPast: date < today,
      isToday: date === today,
    };
  });
}

function getMonthBars(today: string, foodMap: FoodMap, waterMap: WaterMap): MonthBar[] {
  const base = new Date(`${today}T00:00:00`);
  const year = base.getFullYear();
  const curMonth = base.getMonth();

  return Array.from({ length: curMonth + 1 }, (_, m) => {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const passedDays = m < curMonth ? daysInMonth : base.getDate();

    let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFat = 0, totalWater = 0;
    let loggedDays = 0, waterDays = 0;

    for (let d = 1; d <= passedDays; d++) {
      const dateStr = `${key}-${String(d).padStart(2, "0")}`;
      const food = foodMap.get(dateStr);
      const water = waterMap.get(dateStr);
      if (food) { loggedDays++; totalCal += food.cal; totalPro += food.pro; totalCarbs += food.carbs; totalFat += food.fat; }
      if (water) { waterDays++; totalWater += water; }
    }

    return {
      key,
      label: MONTH_SHORT[m],
      avgCal: loggedDays > 0 ? Math.round(totalCal / loggedDays) : 0,
      avgPro: loggedDays > 0 ? totalPro / loggedDays : 0,
      avgCarbs: loggedDays > 0 ? totalCarbs / loggedDays : 0,
      avgFat: loggedDays > 0 ? totalFat / loggedDays : 0,
      avgWater: waterDays > 0 ? Math.round(totalWater / waterDays) : 0,
      loggedDays,
      passedDays,
    };
  });
}

function computeStreak(foodMap: FoodMap, today: string): number {
  const base = new Date(`${today}T00:00:00`);
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    if (foodMap.has(d.toISOString().split("T")[0])) streak++;
    else break;
  }
  return streak;
}

function barColorClass(cal: number, target: number | null, isGap: boolean): string {
  if (isGap) return "bg-destructive/15 border border-dashed border-destructive/40";
  if (cal === 0) return "bg-muted/40";
  if (!target) return "bg-primary/70";
  const r = cal / target;
  if (r >= 0.9 && r <= 1.15) return "bg-green-500";
  if (r >= 0.7) return "bg-amber-400";
  if (r >= 0.5) return "bg-orange-500";
  return "bg-destructive";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, highlight, warn }: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 space-y-0.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold leading-tight ${highlight ? "text-green-500" : warn ? "text-destructive" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NutritionReports({ allEntries, waterLog, macroTargets }: Props) {
  const [period, setPeriod] = useState<Period>("week");
  const today = todayIso();

  const foodMap = useMemo(() => buildFoodMap(allEntries), [allEntries]);
  const waterMap = useMemo(() => buildWaterMap(waterLog), [waterLog]);

  const dayBars = useMemo(
    () => (period !== "year" ? getDayBars(period, today, foodMap, waterMap) : []),
    [period, today, foodMap, waterMap],
  );

  const monthBars = useMemo(
    () => (period === "year" ? getMonthBars(today, foodMap, waterMap) : []),
    [period, today, foodMap, waterMap],
  );

  const stats = useMemo(() => {
    const streak = computeStreak(foodMap, today);

    if (period !== "year") {
      const loggedData = dayBars.filter((d) => d.cal > 0);
      const loggedDays = loggedData.length;
      const gapDays = dayBars.filter((d) => d.isPast && d.cal === 0).length;
      const avgCal = loggedDays > 0 ? Math.round(loggedData.reduce((s, d) => s + d.cal, 0) / loggedDays) : 0;
      const avgPro = loggedDays > 0 ? loggedData.reduce((s, d) => s + d.pro, 0) / loggedDays : 0;
      const avgCarbs = loggedDays > 0 ? loggedData.reduce((s, d) => s + d.carbs, 0) / loggedDays : 0;
      const avgFat = loggedDays > 0 ? loggedData.reduce((s, d) => s + d.fat, 0) / loggedDays : 0;
      const waterDaysData = dayBars.filter((d) => d.water > 0);
      const avgWater = waterDaysData.length > 0
        ? Math.round(waterDaysData.reduce((s, d) => s + d.water, 0) / waterDaysData.length)
        : 0;
      const adherence = macroTargets && avgCal > 0 ? Math.round((avgCal / macroTargets.calories) * 100) : null;
      return { streak, loggedDays, totalPastDays: dayBars.length, gapDays, avgCal, avgPro, avgCarbs, avgFat, avgWater, adherence };
    }

    const loggedDays = monthBars.reduce((s, m) => s + m.loggedDays, 0);
    const totalPastDays = monthBars.reduce((s, m) => s + m.passedDays, 0);
    const gapDays = totalPastDays - loggedDays;
    const avgCal = loggedDays > 0 ? Math.round(monthBars.reduce((s, m) => s + m.avgCal * m.loggedDays, 0) / loggedDays) : 0;
    const avgPro = loggedDays > 0 ? monthBars.reduce((s, m) => s + m.avgPro * m.loggedDays, 0) / loggedDays : 0;
    const avgCarbs = loggedDays > 0 ? monthBars.reduce((s, m) => s + m.avgCarbs * m.loggedDays, 0) / loggedDays : 0;
    const avgFat = loggedDays > 0 ? monthBars.reduce((s, m) => s + m.avgFat * m.loggedDays, 0) / loggedDays : 0;
    const waterMonths = monthBars.filter((m) => m.avgWater > 0);
    const avgWater = waterMonths.length > 0 ? Math.round(waterMonths.reduce((s, m) => s + m.avgWater, 0) / waterMonths.length) : 0;
    const adherence = macroTargets && avgCal > 0 ? Math.round((avgCal / macroTargets.calories) * 100) : null;
    return { streak, loggedDays, totalPastDays, gapDays, avgCal, avgPro, avgCarbs, avgFat, avgWater, adherence };
  }, [period, dayBars, monthBars, foodMap, today, macroTargets]);

  // Unified bar items for rendering
  interface BarItem { key: string; label: string; cal: number; isGap: boolean; isToday: boolean }
  const bars: BarItem[] = period !== "year"
    ? dayBars.map((d) => ({ key: d.date, label: d.label, cal: d.cal, isGap: d.isPast && d.cal === 0, isToday: d.isToday }))
    : monthBars.map((m) => ({ key: m.key, label: m.label, cal: m.avgCal, isGap: m.loggedDays === 0 && m.passedDays > 0, isToday: false }));

  const maxBarCal = Math.max(...bars.map((b) => b.cal), macroTargets?.calories ?? 0, 1);
  const targetLinePct = macroTargets ? (macroTargets.calories / maxBarCal) * 100 : null;

  const barW = period === "month" ? "w-6" : "w-9";

  const gapItems: string[] = period !== "year"
    ? dayBars
        .filter((d) => d.isPast && d.cal === 0)
        .map((d) => new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))
    : monthBars
        .filter((m) => m.loggedDays === 0 && m.passedDays > 0)
        .map((m) => `${m.label} — no entries (${m.passedDays} days passed)`);

  const hasAnyData = allEntries.length > 0 || waterLog.length > 0;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-full sm:w-auto sm:inline-flex">
        {(["week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={[
              "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
              period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {p}
          </button>
        ))}
      </div>

      {!hasAnyData ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <p className="text-muted-foreground text-sm">No data logged yet. Start tracking meals to see your reports.</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard
              label="Logged"
              value={`${stats.loggedDays}/${stats.totalPastDays}`}
              sub="days"
              highlight={stats.loggedDays === stats.totalPastDays && stats.totalPastDays > 0}
            />
            <StatCard
              label="Streak"
              value={stats.streak > 0 ? String(stats.streak) : "—"}
              sub={stats.streak === 1 ? "day" : "days"}
              highlight={stats.streak >= 7}
            />
            <StatCard
              label="Avg Calories"
              value={stats.avgCal > 0 ? stats.avgCal.toLocaleString() : "—"}
              sub="kcal / logged day"
            />
            {stats.adherence !== null ? (
              <StatCard
                label="Adherence"
                value={`${stats.adherence}%`}
                sub="to calorie target"
                highlight={stats.adherence >= 90 && stats.adherence <= 115}
                warn={stats.adherence < 60}
              />
            ) : (
              <StatCard
                label="Gaps"
                value={stats.gapDays > 0 ? String(stats.gapDays) : "None"}
                sub="missed days"
                warn={stats.gapDays > 0}
                highlight={stats.gapDays === 0 && stats.totalPastDays > 0}
              />
            )}
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                {period === "week" ? "This Week" : period === "month" ? "This Month" : "This Year"}
                {period === "year" && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">avg kcal/day per month</span>}
              </p>
              {macroTargets && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-5 border-t-2 border-dashed border-primary/60" />
                  <span className="text-[11px] text-muted-foreground">{macroTargets.calories} kcal target</span>
                </div>
              )}
            </div>
            <div className="px-4 pt-4 pb-3 overflow-x-auto">
              <div className="min-w-max">
                {/* Bars */}
                <div className={`flex gap-1.5 items-end relative`} style={{ height: `${BAR_H}px` }}>
                  {targetLinePct !== null && targetLinePct <= 100 && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-primary/50 pointer-events-none"
                      style={{ bottom: `${(targetLinePct / 100) * BAR_H}px` }}
                    />
                  )}
                  {bars.map((bar) => {
                    const h = bar.cal > 0
                      ? Math.max(4, Math.round((bar.cal / maxBarCal) * BAR_H))
                      : bar.isGap ? 10 : 4;
                    const colorCls = barColorClass(bar.cal, macroTargets?.calories ?? null, bar.isGap);
                    return (
                      <div
                        key={bar.key}
                        title={bar.cal > 0 ? `${bar.cal.toLocaleString()} kcal` : "No data"}
                        className={[
                          `${barW} rounded-t-sm transition-all`,
                          colorCls,
                          bar.isToday ? "ring-2 ring-primary/50 ring-offset-1 ring-offset-card" : "",
                        ].join(" ")}
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>
                {/* Labels */}
                <div className="flex gap-1.5 mt-1.5">
                  {bars.map((bar) => (
                    <div key={bar.key} className={`${barW} text-center`}>
                      <span className={`text-[10px] ${bar.isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3">
              {macroTargets ? (
                <>
                  <LegendItem color="bg-green-500" label="On target (90–115%)" />
                  <LegendItem color="bg-amber-400" label="70–90% of target" />
                  <LegendItem color="bg-orange-500" label="50–70% of target" />
                  <LegendItem color="bg-destructive" label="Under 50%" />
                  <LegendItem color="bg-destructive/15" label="Gap day" dashed />
                </>
              ) : (
                <LegendItem color="bg-primary/70" label="Calories logged" />
              )}
            </div>
          </div>

          {/* Macro averages */}
          {macroTargets && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/30">
                <p className="text-sm font-semibold">Macro Averages</p>
                <p className="text-[11px] text-muted-foreground">Per logged day vs. daily target</p>
              </div>
              <div className="px-4 py-3 space-y-3">
                {[
                  { label: "Calories", avg: stats.avgCal, target: macroTargets.calories, unit: "kcal", bar: "bg-primary" },
                  { label: "Protein", avg: Math.round(stats.avgPro), target: macroTargets.protein, unit: "g", bar: "bg-blue-500" },
                  { label: "Carbs", avg: Math.round(stats.avgCarbs), target: macroTargets.carbs, unit: "g", bar: "bg-amber-500" },
                  { label: "Fat", avg: Math.round(stats.avgFat), target: macroTargets.fat, unit: "g", bar: "bg-red-500" },
                ].map((m) => {
                  const pct = m.target > 0 && m.avg > 0 ? Math.min(120, Math.round((m.avg / m.target) * 100)) : 0;
                  const displayPct = m.avg > 0 && m.target > 0 ? Math.round((m.avg / m.target) * 100) : null;
                  return (
                    <div key={m.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium shrink-0">{m.label}</span>
                        <span className="text-muted-foreground text-right">
                          {m.avg > 0 ? m.avg.toLocaleString() : "—"}
                          {m.unit}
                          <span className="mx-1 opacity-50">/</span>
                          {m.target}{m.unit}
                          {displayPct !== null && (
                            <span className={[
                              "ml-1.5 font-semibold",
                              displayPct >= 90 && displayPct <= 115 ? "text-green-500"
                                : displayPct < 70 ? "text-destructive"
                                : "text-foreground",
                            ].join(" ")}>
                              ({displayPct}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.bar} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Water */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-semibold">Water Intake</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground">Avg per logged day</span>
                <span className="font-medium">
                  {stats.avgWater > 0
                    ? stats.avgWater >= 1000
                      ? `${(stats.avgWater / 1000).toFixed(1)}L`
                      : `${stats.avgWater}ml`
                    : "—"}
                  <span className="text-muted-foreground ml-1">
                    / {WATER_TARGET_ML / 1000}L target
                  </span>
                  {stats.avgWater > 0 && (
                    <span className={[
                      "ml-1.5 font-semibold",
                      stats.avgWater >= WATER_TARGET_ML ? "text-green-500" : "",
                    ].join(" ")}>
                      ({Math.round((stats.avgWater / WATER_TARGET_ML) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
              {stats.avgWater > 0 && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all"
                    style={{ width: `${Math.min(100, (stats.avgWater / WATER_TARGET_ML) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Gaps */}
          {gapItems.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm font-semibold">Missed Days</p>
                <span className="ml-auto text-xs text-muted-foreground">
                  {gapItems.length} gap{gapItems.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {gapItems.slice(0, 20).map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
                {gapItems.length > 20 && (
                  <p className="text-xs text-muted-foreground pt-1">+{gapItems.length - 20} more</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${color} ${dashed ? "border border-dashed border-destructive/50" : ""}`} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
