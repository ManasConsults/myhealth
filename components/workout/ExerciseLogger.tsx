"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { clearWorkoutLogForDate, logWorkout, logWorkoutsBatch, removeWorkoutLogEntry, updateWorkoutLogEntry } from "@/lib/actions";
import { WorkoutLogEntry, WorkoutPlan, WorkoutSet } from "@/lib/types";
import { BookOpen, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const JS_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CAL_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDates(): Record<string, string> {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
  return Object.fromEntries(
    WEEK_ORDER.map((day, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return [day, d.toISOString().split("T")[0]];
    })
  );
}

function setsKey(day: string, exercise: string) {
  return `${day}::${exercise}`;
}

function defaultSets(): WorkoutSet[] {
  return [
    { setNumber: 1, reps: 10, weight: 60 },
    { setNumber: 2, reps: 10, weight: 60 },
    { setNumber: 3, reps: 10, weight: 60 },
  ];
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

type SetsMap = Record<string, WorkoutSet[]>;

interface Props {
  userId: string;
  log: WorkoutLogEntry[];
  plans: WorkoutPlan[];
  onUpdate: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ExerciseLogger({ userId, log, plans, onUpdate }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const todayDayName = JS_DAY_NAMES[new Date().getDay()];

  // Ad-hoc dialog
  const [open, setOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState<WorkoutSet[]>([{ setNumber: 1, reps: 8, weight: 60 }]);

  // Edit dialog
  const [editEntry, setEditEntry] = useState<WorkoutLogEntry | null>(null);
  const [editSets, setEditSets] = useState<WorkoutSet[]>([]);

  // Plan log sheet
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [scope, setScope] = useState<"today" | "week">("today");
  // When today is a rest day, user can pick a plan day to borrow exercises from — still logged for today
  const [borrowDay, setBorrowDay] = useState<string | null>(null);
  const [setsMap, setSetsMap] = useState<SetsMap>({});

  // Calendar
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [isPending, startTransition] = useTransition();

  // ── Ad-hoc log ─────────────────────────────────────────────────

  function addSet() {
    setSets((p) => [...p, { setNumber: p.length + 1, reps: 8, weight: 60 }]);
  }

  function removeSet(idx: number) {
    setSets((p) => p.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })));
  }

  function updateSet(idx: number, field: keyof WorkoutSet, val: number) {
    setSets((p) => p.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  }

  function handleLog(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    startTransition(async () => {
      await logWorkout(userId, exerciseName, sets);
      setExerciseName("");
      setSets([{ setNumber: 1, reps: 8, weight: 60 }]);
      setOpen(false);
      goToToday();
      onUpdate();
    });
  }

  function handleDeleteEntry(id: string) {
    startTransition(async () => {
      await removeWorkoutLogEntry(id);
      onUpdate();
    });
  }

  function handleClearDay() {
    startTransition(async () => {
      await clearWorkoutLogForDate(userId, selectedDate);
      onUpdate();
    });
  }

  function openEdit(entry: WorkoutLogEntry) {
    setEditEntry(entry);
    setEditSets(entry.sets.map((s) => ({ ...s })));
  }

  function handleEditSave(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!editEntry) return;
    startTransition(async () => {
      await updateWorkoutLogEntry(editEntry.id, editSets);
      setEditEntry(null);
      onUpdate();
    });
  }

  function addEditSet() {
    setEditSets((p) => [...p, { setNumber: p.length + 1, reps: 10, weight: 60 }]);
  }

  function removeEditSet(idx: number) {
    setEditSets((p) => p.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })));
  }

  function updateEditSet(idx: number, field: keyof WorkoutSet, val: number) {
    setEditSets((p) => p.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  }

  // ── Plan log ───────────────────────────────────────────────────

  function buildSetsMap(planId: string, s: "today" | "week", borrow?: string | null): SetsMap {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return {};
    if (s === "week") {
      const map: SetsMap = {};
      for (const planDay of plan.days) {
        for (const ex of planDay.exercises) {
          map[setsKey(planDay.day, ex)] = defaultSets();
        }
      }
      return map;
    }
    if (!borrow) return {};
    const planDay = plan.days.find((d) => d.day === borrow);
    if (!planDay) return {};
    const map: SetsMap = {};
    for (const ex of planDay.exercises) {
      map[setsKey(borrow, ex)] = defaultSets();
    }
    return map;
  }

  function todayDefaultBorrow(planId: string): string | null {
    const plan = plans.find((p) => p.id === planId);
    return plan?.days.find((d) => d.day === todayDayName)?.day ?? null;
  }

  function openPlanSheet() {
    const first = plans[0];
    if (!first) return;
    const borrow = todayDefaultBorrow(first.id);
    setSelectedPlanId(first.id);
    setScope("today");
    setBorrowDay(borrow);
    setSetsMap(buildSetsMap(first.id, "today", borrow));
    setPlanOpen(true);
  }

  function handlePlanSelect(planId: string) {
    const borrow = todayDefaultBorrow(planId);
    setSelectedPlanId(planId);
    setBorrowDay(borrow);
    setSetsMap(scope === "today" ? buildSetsMap(planId, "today", borrow) : buildSetsMap(planId, "week"));
  }

  function handleScopeChange(s: "today" | "week") {
    setScope(s);
    if (s === "today") {
      const borrow = todayDefaultBorrow(selectedPlanId);
      setBorrowDay(borrow);
      setSetsMap(buildSetsMap(selectedPlanId, "today", borrow));
    } else {
      setBorrowDay(null);
      setSetsMap(buildSetsMap(selectedPlanId, "week"));
    }
  }

  function handleBorrowDaySelect(day: string) {
    setBorrowDay(day);
    setSetsMap(buildSetsMap(selectedPlanId, "today", day));
  }

  function addExSet(day: string, ex: string) {
    const key = setsKey(day, ex);
    setSetsMap((p) => {
      const cur = p[key] ?? [];
      return { ...p, [key]: [...cur, { setNumber: cur.length + 1, reps: 10, weight: 60 }] };
    });
  }

  function removeExSet(day: string, ex: string, idx: number) {
    const key = setsKey(day, ex);
    setSetsMap((p) => ({
      ...p,
      [key]: (p[key] ?? []).filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })),
    }));
  }

  function updateExSet(day: string, ex: string, idx: number, field: keyof WorkoutSet, val: number) {
    const key = setsKey(day, ex);
    setSetsMap((p) => ({
      ...p,
      [key]: (p[key] ?? []).map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    }));
  }

  function handleLogFromPlan(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;
    const weekDates = getWeekDates();
    const entries: Array<{ exerciseName: string; sets: WorkoutSet[]; date: string }> = [];
    if (scope === "today") {
      const sourceDay = borrowDay ?? todayDayName;
      const planDay = plan.days.find((d) => d.day === sourceDay);
      if (!planDay) return;
      for (const ex of planDay.exercises) {
        const exSets = setsMap[setsKey(sourceDay, ex)];
        if (exSets?.length) entries.push({ exerciseName: ex, sets: exSets, date: today });
      }
    } else {
      for (const day of plan.days) {
        const date = weekDates[day.day] ?? today;
        for (const ex of day.exercises) {
          const exSets = setsMap[setsKey(day.day, ex)];
          if (exSets?.length) entries.push({ exerciseName: ex, sets: exSets, date });
        }
      }
    }
    startTransition(async () => {
      await logWorkoutsBatch(userId, entries);
      setPlanOpen(false);
      goToToday();
      onUpdate();
    });
  }

  // ── Calendar ───────────────────────────────────────────────────

  function goToToday() {
    const d = new Date();
    setSelectedDate(today);
    setDisplayMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const { year, month } = displayMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const datesWithEntries = new Set(log.map((e) => e.date));

  function isoDate(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // ── Derived ────────────────────────────────────────────────────

  const selectedLabel = selectedDate === today ? "Today" : fmtDate(selectedDate);
  const filteredLog = log.filter((e) => e.date === selectedDate);
  const grouped = filteredLog.reduce<Record<string, WorkoutLogEntry[]>>((acc, e) => {
    acc[e.exerciseName] = acc[e.exerciseName] ?? [];
    acc[e.exerciseName].push(e);
    return acc;
  }, {});

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const weekDates = getWeekDates();
  const activeTodaySource = borrowDay
    ? (selectedPlan?.days.find((d) => d.day === borrowDay) ?? null)
    : null;

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">

      {/* ── Left: log ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">Exercise Log</h3>
            <p className="text-xs text-muted-foreground">{selectedLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {filteredLog.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleClearDay} disabled={isPending}>
                <X className="w-3.5 h-3.5" />Clear day
              </Button>
            )}
            {plans.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openPlanSheet}>
                <BookOpen className="w-3.5 h-3.5" />Log from Plan
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4" />Log Exercise
            </Button>
          </div>
        </div>

        {/* ── Ad-hoc dialog ──────────────────────────────────── */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Exercise</DialogTitle></DialogHeader>
            <form onSubmit={handleLog} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Exercise</Label>
                <Input
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="e.g. Bench Press"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Sets</Label>
                {sets.map((set, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{set.setNumber}</span>
                    <Input type="number" min={1} value={set.reps} onChange={(e) => updateSet(idx, "reps", parseInt(e.target.value))} className="w-20" placeholder="Reps" />
                    <Input type="number" min={0} step="2.5" value={set.weight} onChange={(e) => updateSet(idx, "weight", parseFloat(e.target.value))} className="w-20" placeholder="kg" />
                    <span className="text-xs text-muted-foreground shrink-0">kg</span>
                    {sets.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSet(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-1.5 mt-1" onClick={addSet}>
                  <Plus className="w-3.5 h-3.5" />Add Set
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Edit dialog ────────────────────────────────────── */}
        <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit — {editEntry?.exerciseName}</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Sets</Label>
                {editSets.map((set, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{set.setNumber}</span>
                    <Input type="number" min={1} value={set.reps} onChange={(e) => updateEditSet(idx, "reps", parseInt(e.target.value))} className="w-20" placeholder="Reps" />
                    <Input type="number" min={0} step="2.5" value={set.weight} onChange={(e) => updateEditSet(idx, "weight", parseFloat(e.target.value))} className="w-20" placeholder="kg" />
                    <span className="text-xs text-muted-foreground shrink-0">kg</span>
                    {editSets.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEditSet(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-1.5 mt-1" onClick={addEditSet}>
                  <Plus className="w-3.5 h-3.5" />Add Set
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Plan log sheet ─────────────────────────────────── */}
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
                          onClick={() => handlePlanSelect(plan.id)}
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

                {/* Scope toggle */}
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["today", "week"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleScopeChange(s)}
                        className={[
                          "py-3 rounded-xl text-sm font-semibold border transition-all leading-none",
                          scope === s
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
                        ].join(" ")}
                      >
                        {s === "today" ? (
                          <span className="flex flex-col items-center gap-0.5">
                            <span>Today</span>
                            <span className="text-[11px] font-normal opacity-70">{todayDayName}</span>
                          </span>
                        ) : (
                          <span className="flex flex-col items-center gap-0.5">
                            <span>This Week</span>
                            <span className="text-[11px] font-normal opacity-70">
                              {selectedPlan?.days.length ?? 0} training days
                            </span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Exercise configuration */}
                {scope === "today" ? (
                  <div className="space-y-4">
                    {/* Day picker — always visible so the user can swap to any plan day */}
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPlan?.days.map((planDay) => (
                        <button
                          key={planDay.day}
                          type="button"
                          onClick={() => handleBorrowDaySelect(planDay.day)}
                          className={[
                            "flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                            borrowDay === planDay.day
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
                          ].join(" ")}
                        >
                          <span>{planDay.day.slice(0, 3)}</span>
                          <span className="text-[10px] font-normal opacity-70 mt-0.5">
                            {planDay.label ?? `${planDay.exercises.length} ex`}
                          </span>
                        </button>
                      ))}
                    </div>

                    {activeTodaySource && borrowDay ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-semibold">{borrowDay}</p>
                          {activeTodaySource.label && (
                            <span className="text-xs font-medium text-primary">{activeTodaySource.label}</span>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {activeTodaySource.exercises.length} exercise{activeTodaySource.exercises.length !== 1 ? "s" : ""}
                            {borrowDay !== todayDayName && " · logged for today"}
                          </p>
                        </div>
                        {activeTodaySource.exercises.map((ex) => (
                          <ExerciseSetEditor
                            key={ex}
                            exerciseName={ex}
                            sets={setsMap[setsKey(borrowDay, ex)] ?? []}
                            onAdd={() => addExSet(borrowDay, ex)}
                            onRemove={(i) => removeExSet(borrowDay, ex, i)}
                            onUpdate={(i, f, v) => updateExSet(borrowDay, ex, i, f, v)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Pick a day above to load exercises for today.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedPlan?.days.map((day) => {
                      const date = weekDates[day.day];
                      return (
                        <div key={day.day} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <p className="text-sm font-semibold">{day.day}</p>
                            {date && (
                              <span className="text-xs text-muted-foreground">{fmtDate(date)}</span>
                            )}
                          </div>
                          {day.exercises.map((ex) => (
                            <ExerciseSetEditor
                              key={ex}
                              exerciseName={ex}
                              sets={setsMap[setsKey(day.day, ex)] ?? []}
                              onAdd={() => addExSet(day.day, ex)}
                              onRemove={(i) => removeExSet(day.day, ex, i)}
                              onUpdate={(i, f, v) => updateExSet(day.day, ex, i, f, v)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 px-5 py-4 border-t bg-popover">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending || (scope === "today" && !activeTodaySource)}
                >
                  {isPending
                    ? "Logging…"
                    : scope === "today"
                    ? `Log Today's Workout`
                    : "Log This Week"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        {/* ── Log list ───────────────────────────────────────── */}
        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-10 text-center space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              No exercises logged for {selectedLabel.toLowerCase()}.
            </p>
            {plans.length > 0 && selectedDate === today && (
              <p className="text-xs text-muted-foreground">
                Use{" "}
                <button
                  className="underline underline-offset-2 text-primary hover:text-primary/80 transition-colors"
                  onClick={openPlanSheet}
                >
                  Log from Plan
                </button>{" "}
                to quickly add your scheduled exercises.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {Object.entries(grouped).map(([name, entries]) => (
              <Card key={name}>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">{name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-10">Set</TableHead>
                        <TableHead className="text-xs text-right">Reps</TableHead>
                        <TableHead className="text-xs text-right">Weight</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.flatMap((entry) =>
                        entry.sets.map((set, setIdx) => (
                          <TableRow key={`${entry.id}-${set.setNumber}`}>
                            <TableCell className="text-xs">{set.setNumber}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-xs">{set.reps}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">{set.weight} kg</TableCell>
                            <TableCell>
                              {setIdx === 0 && (
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => openEdit(entry)}
                                    disabled={isPending}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    disabled={isPending}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: calendar ───────────────────────────────────── */}
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
                const hasEntry = isValid && datesWithEntries.has(dateStr);
                return (
                  <div key={i} className="flex flex-col items-center py-0.5">
                    {isValid ? (
                      <button
                        onClick={() => setSelectedDate(dateStr)}
                        className={[
                          "relative w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary text-primary-foreground"
                            : isToday ? "ring-1 ring-primary text-primary"
                            : "hover:bg-muted text-foreground",
                        ].join(" ")}
                      >
                        {dayNum}
                        {hasEntry && (
                          <span className={[
                            "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary",
                          ].join(" ")} />
                        )}
                      </button>
                    ) : <div className="w-8 h-8" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── ExerciseSetEditor ────────────────────────────────────────────────────────

interface EditorProps {
  exerciseName: string;
  sets: WorkoutSet[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: keyof WorkoutSet, val: number) => void;
}

function ExerciseSetEditor({ exerciseName, sets, onAdd, onRemove, onUpdate }: EditorProps) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 space-y-2.5">
      <p className="text-sm font-medium">{exerciseName}</p>
      <div className="space-y-1.5">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{set.setNumber}</span>
            <Input
              type="number" min={1} value={set.reps}
              onChange={(e) => onUpdate(i, "reps", parseInt(e.target.value))}
              className="w-16 h-8 text-sm text-center px-1"
            />
            <span className="text-xs text-muted-foreground shrink-0">reps</span>
            <Input
              type="number" min={0} step="2.5" value={set.weight}
              onChange={(e) => onUpdate(i, "weight", parseFloat(e.target.value))}
              className="w-20 h-8 text-sm text-center px-1"
            />
            <span className="text-xs text-muted-foreground shrink-0">kg</span>
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-auto w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="w-3 h-3" />Add set
      </button>
    </div>
  );
}
