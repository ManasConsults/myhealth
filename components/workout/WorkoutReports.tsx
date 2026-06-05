"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Calendar, TrendingUp, Layers } from "lucide-react";
import type { WorkoutLogEntry } from "@/lib/types";

type Period = "week" | "month" | "year";

interface Bar {
  label: string;
  value: number;
}

interface Session {
  date: string;
  maxWeight: number;
  totalReps: number;
  volume: number;
  totalSets: number;
}

interface Props {
  log: WorkoutLogEntry[];
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function toLocal(s: string): Date {
  return new Date(s + "T00:00:00");
}

function entryVol(e: WorkoutLogEntry): number {
  return e.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function WorkoutReports({ log }: Props) {
  const [period, setPeriod] = useState<Period>("week");
  const [selectedExercise, setSelectedExercise] = useState("");

  const today = useMemo(() => fmtDate(new Date()), []);

  const startDate = useMemo(() => {
    const d = new Date();
    if (period === "week") d.setDate(d.getDate() - 6);
    else if (period === "month") d.setDate(d.getDate() - 29);
    else d.setDate(d.getDate() - 364);
    return fmtDate(d);
  }, [period]);

  const periodLog = useMemo(
    () => log.filter((e) => e.date >= startDate && e.date <= today),
    [log, startDate, today]
  );

  const stats = useMemo(() => {
    const days = new Set(periodLog.map((e) => e.date)).size;
    const volume = Math.round(periodLog.reduce((s, e) => s + entryVol(e), 0));
    const sets = periodLog.reduce((s, e) => s + e.sets.length, 0);
    const exercises = new Set(periodLog.map((e) => e.exerciseName)).size;
    return { days, volume, sets, exercises };
  }, [periodLog]);

  const volByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of periodLog) {
      map.set(e.date, (map.get(e.date) ?? 0) + entryVol(e));
    }
    return map;
  }, [periodLog]);

  const volumeBars = useMemo((): Bar[] => {
    if (period === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          value: Math.round(volByDate.get(fmtDate(d)) ?? 0),
        };
      });
    }

    if (period === "month") {
      const weeks: Bar[] = [
        { label: "Wk 4", value: 0 },
        { label: "Wk 3", value: 0 },
        { label: "Wk 2", value: 0 },
        { label: "Wk 1", value: 0 },
      ];
      const todayMs = toLocal(today).getTime();
      for (const [date, vol] of volByDate) {
        const daysAgo = Math.floor((todayMs - toLocal(date).getTime()) / 86400000);
        const wi = Math.min(3, Math.floor(daysAgo / 7));
        weeks[3 - wi].value += vol;
      }
      return weeks.map((w) => ({ ...w, value: Math.round(w.value) }));
    }

    // Year: aggregate by calendar month
    const byMonth = new Map<string, number>();
    for (const [date, vol] of volByDate) {
      const key = date.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + vol);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, vol]) => ({
        label: toLocal(key + "-01").toLocaleDateString("en-US", { month: "short" }),
        value: Math.round(vol),
      }));
  }, [period, volByDate, today]);

  const maxVolBar = Math.max(...volumeBars.map((b) => b.value), 1);
  const periodDays = period === "week" ? 7 : period === "month" ? 30 : 365;

  const exerciseNames = useMemo(
    () => Array.from(new Set(log.map((e) => e.exerciseName))).sort(),
    [log]
  );

  // "" means all exercises
  const sessions = useMemo((): Session[] => {
    if (!selectedExercise) return [];
    const byDate = new Map<string, WorkoutLogEntry[]>();
    for (const e of periodLog) {
      if (e.exerciseName !== selectedExercise) continue;
      const arr = byDate.get(e.date) ?? [];
      arr.push(e);
      byDate.set(e.date, arr);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => {
        const allSets = entries.flatMap((e) => e.sets);
        const maxWeight = Math.max(...allSets.map((s) => s.weight));
        const totalReps = allSets.reduce((s, set) => s + set.reps, 0);
        const volume = Math.round(allSets.reduce((s, set) => s + set.weight * set.reps, 0));
        return { date, maxWeight, totalReps, volume, totalSets: allSets.length };
      });
  }, [periodLog, selectedExercise]);

  const maxSessWeight = Math.max(...sessions.map((s) => s.maxWeight), 1);

  interface ExerciseSummary {
    name: string;
    sessionCount: number;
    maxWeight: number;
    totalSets: number;
    totalReps: number;
    volume: number;
  }

  const exerciseSummaries = useMemo((): ExerciseSummary[] => {
    if (selectedExercise !== "") return [];
    const map = new Map<string, { dates: Set<string>; maxWeight: number; totalSets: number; totalReps: number; volume: number }>();
    for (const e of periodLog) {
      const cur = map.get(e.exerciseName) ?? { dates: new Set(), maxWeight: 0, totalSets: 0, totalReps: 0, volume: 0 };
      cur.dates.add(e.date);
      cur.maxWeight = Math.max(cur.maxWeight, ...e.sets.map((s) => s.weight));
      cur.totalSets += e.sets.length;
      cur.totalReps += e.sets.reduce((s, set) => s + set.reps, 0);
      cur.volume += Math.round(e.sets.reduce((s, set) => s + set.weight * set.reps, 0));
      map.set(e.exerciseName, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, s]) => ({ name, sessionCount: s.dates.size, maxWeight: s.maxWeight, totalSets: s.totalSets, totalReps: s.totalReps, volume: s.volume }));
  }, [periodLog, selectedExercise]);

  const displayDate = (d: string) =>
    toLocal(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (log.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Dumbbell className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-medium">No workout data yet</p>
        <p className="text-sm mt-1">Log your first workout to see reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(["week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors min-h-11 ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">Days Trained</span>
            </div>
            <p className="text-2xl font-bold">{stats.days}</p>
            <p className="text-xs text-muted-foreground">of {periodDays} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">Volume</span>
            </div>
            <p className="text-2xl font-bold">{stats.volume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">kg lifted</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-chart-3" />
              <span className="text-xs text-muted-foreground">Sets</span>
            </div>
            <p className="text-2xl font-bold">{stats.sets}</p>
            <p className="text-xs text-muted-foreground">logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-chart-4" />
              <span className="text-xs text-muted-foreground">Exercises</span>
            </div>
            <p className="text-2xl font-bold">{stats.exercises}</p>
            <p className="text-xs text-muted-foreground">unique</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {periodLog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No workouts in this period</p>
          ) : (
            <div>
              <div className="flex items-end h-28 gap-1 mb-1">
                {volumeBars.map((bar, i) => (
                  <div key={i} className="flex flex-col justify-end flex-1 h-full">
                    <div
                      title={`${bar.value.toLocaleString()} kg`}
                      className="w-full rounded-t-sm bg-chart-1 transition-all duration-500"
                      style={{ height: `${Math.max(2, (bar.value / maxVolBar) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {volumeBars.map((bar, i) => (
                  <div key={i} className="flex-1 text-center">
                    <span className="text-[10px] text-muted-foreground">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise progression */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Exercise Progression</CardTitle>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="text-sm border border-input rounded-lg px-3 bg-background min-h-11 sm:h-9 sm:min-h-0"
            >
              <option value="">All exercises</option>
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedExercise === "" ? (
            /* All exercises summary */
            exerciseSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No workouts in this period</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-96">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Exercise</th>
                      <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Sessions</th>
                      <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Max Weight</th>
                      <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Sets</th>
                      <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Reps</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exerciseSummaries.map((ex) => (
                      <tr
                        key={ex.name}
                        className="border-b border-border/40 last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => setSelectedExercise(ex.name)}
                      >
                        <td className="py-2.5 pr-3 font-medium">{ex.name}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">{ex.sessionCount}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{ex.maxWeight} kg</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{ex.totalSets}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{ex.totalReps}</td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">{ex.volume} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No data for this exercise in this period</p>
          ) : (
            <>
              {/* Weight progression bar chart */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Max weight per session (kg)</p>
                <div className="flex items-end h-20 gap-1">
                  {sessions.slice(-20).map((s, i) => (
                    <div key={i} className="flex flex-col justify-end flex-1 h-full">
                      <div
                        title={`${s.maxWeight} kg — ${displayDate(s.date)}`}
                        className="w-full rounded-t-sm bg-chart-2 transition-all duration-500"
                        style={{ height: `${Math.max(4, (s.maxWeight / maxSessWeight) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sessions table */}
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-80">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Max Weight</th>
                      <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Sets</th>
                      <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Reps</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => {
                      const prev = sessions[i - 1];
                      const delta = prev ? s.maxWeight - prev.maxWeight : 0;
                      return (
                        <tr key={s.date} className="border-b border-border/40 last:border-0">
                          <td className="py-2.5 pr-3 text-muted-foreground">{displayDate(s.date)}</td>
                          <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                            {s.maxWeight} kg
                            {delta !== 0 && (
                              <span
                                className={`ml-1 text-[10px] ${
                                  delta > 0 ? "text-chart-2" : "text-destructive"
                                }`}
                              >
                                {delta > 0 ? "+" : ""}
                                {delta}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{s.totalSets}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{s.totalReps}</td>
                          <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                            {s.volume} kg
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
