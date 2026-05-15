"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clearWorkoutLogForDate, logWorkout, logWorkoutsBatch, removeWorkoutLogEntry, updateWorkoutLogEntry } from "@/lib/actions";
import { ExerciseLibrary, WorkoutLogEntry, WorkoutPlan, WorkoutSet } from "@/lib/types";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { ExerciseType, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_OPTIONS } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const JS_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CAL_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toLocalISO(d);
}

// ── Types ────────────────────────────────────────────────────────────────────

type SetsMap = Record<string, WorkoutSet[]>;

interface Props {
  log: WorkoutLogEntry[];
  plans: WorkoutPlan[];
  exerciseLibrary: ExerciseLibrary[];
  onUpdate: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ExerciseLogger({ log, plans, exerciseLibrary, onUpdate }: Props) {
  const today = toLocalISO(new Date());

  // Ad-hoc dialog
  const [open, setOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sets, setSets] = useState<WorkoutSet[]>([{ setNumber: 1, reps: 8, weight: 60 }]);

  // Edit dialog
  const [editEntry, setEditEntry] = useState<WorkoutLogEntry | null>(null);
  const [editSets, setEditSets] = useState<WorkoutSet[]>([]);

  // Clear day confirmation
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Plan log sheet
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  // When today is a rest day, user can pick a plan day to borrow exercises from — still logged for today
  const [borrowDay, setBorrowDay] = useState<string | null>(null);
  const [setsMap, setSetsMap] = useState<SetsMap>({});

  // Date state
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Native date input ref for mobile picker
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();

  // ── Date navigation ────────────────────────────────────────────

  function navigateDay(delta: number) {
    const next = addDays(selectedDate, delta);
    if (next > today) return;
    setSelectedDate(next);
    const d = new Date(`${next}T00:00:00`);
    setDisplayMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  function handleDateInputChange(val: string) {
    if (!val || val > today) return;
    setSelectedDate(val);
    const d = new Date(`${val}T00:00:00`);
    setDisplayMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

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
      await logWorkout(exerciseName, sets, selectedDate, exerciseType ?? undefined);
      setExerciseName("");
      setExerciseType(null);
      setSets([{ setNumber: 1, reps: 8, weight: 60 }]);
      setOpen(false);
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
    setConfirmClearOpen(true);
  }

  function handleClearDayConfirmed() {
    setConfirmClearOpen(false);
    startTransition(async () => {
      await clearWorkoutLogForDate(selectedDate);
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

  function buildSetsMap(planId: string, borrow?: string | null): SetsMap {
    if (!borrow) return {};
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return {};
    const planDay = plan.days.find((d) => d.day === borrow);
    if (!planDay) return {};
    const map: SetsMap = {};
    for (const ex of planDay.exercises) {
      map[setsKey(borrow, ex)] = defaultSets();
    }
    return map;
  }

  function defaultBorrowForDate(planId: string, date: string): string | null {
    const dayName = JS_DAY_NAMES[new Date(date + "T00:00:00").getDay()];
    const plan = plans.find((p) => p.id === planId);
    return plan?.days.find((d) => d.day === dayName)?.day ?? null;
  }

  function openPlanSheet() {
    const first = plans[0];
    if (!first) return;
    const borrow = defaultBorrowForDate(first.id, selectedDate);
    setSelectedPlanId(first.id);
    setBorrowDay(borrow);
    setSetsMap(buildSetsMap(first.id, borrow));
    setPlanOpen(true);
  }

  function handlePlanSelect(planId: string) {
    const borrow = defaultBorrowForDate(planId, selectedDate);
    setSelectedPlanId(planId);
    setBorrowDay(borrow);
    setSetsMap(buildSetsMap(planId, borrow));
  }

  function handleBorrowDaySelect(day: string) {
    setBorrowDay(day);
    setSetsMap(buildSetsMap(selectedPlanId, day));
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
    const sourceDay = borrowDay ?? selectedDayName;
    const planDay = plan.days.find((d) => d.day === sourceDay);
    if (!planDay) return;
    const entries: Array<{ exerciseName: string; sets: WorkoutSet[]; date: string }> = [];
    for (const ex of planDay.exercises) {
      const exSets = setsMap[setsKey(sourceDay, ex)];
      if (exSets?.length) entries.push({ exerciseName: ex, sets: exSets, date: selectedDate });
    }
    startTransition(async () => {
      await logWorkoutsBatch(entries);
      setPlanOpen(false);
      onUpdate();
    });
  }

  // ── Calendar ───────────────────────────────────────────────────

  const { year, month } = displayMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const datesWithEntries = new Set(log.map((e) => e.date));

  function isoDate(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // ── Exercise autocomplete ──────────────────────────────────────

  const suggestions = exerciseLibrary
    .filter((ex) => ex.name.toLowerCase().includes(exerciseName.toLowerCase()))
    .slice(0, 8);

  // ── Derived ────────────────────────────────────────────────────

  const selectedLabel = selectedDate === today ? "Today" : fmtDate(selectedDate);
  const selectedDayName = JS_DAY_NAMES[new Date(selectedDate + "T00:00:00").getDay()];
  const filteredLog = log.filter((e) => e.date === selectedDate);
  const grouped = filteredLog.reduce<Record<string, WorkoutLogEntry[]>>((acc, e) => {
    acc[e.exerciseName] = acc[e.exerciseName] ?? [];
    acc[e.exerciseName].push(e);
    return acc;
  }, {});

  const lastSessionByExercise = log
    .filter((e) => e.date < selectedDate)
    .reduce<Record<string, { date: string; sets: WorkoutSet[] }>>((acc, e) => {
      const prev = acc[e.exerciseName];
      if (!prev || e.date > prev.date) {
        acc[e.exerciseName] = { date: e.date, sets: [...e.sets] };
      } else if (e.date === prev.date) {
        acc[e.exerciseName] = { date: prev.date, sets: [...prev.sets, ...e.sets] };
      }
      return acc;
    }, {});

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const activeTodaySource = borrowDay
    ? (selectedPlan?.days.find((d) => d.day === borrowDay) ?? null)
    : null;

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

      {/* ── Left: log ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Mobile date navigation — hidden on lg */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => navigateDay(-1)}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="relative flex-1">
            <button
              className="w-full min-h-11 flex items-center justify-center gap-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              onClick={() => dateInputRef.current?.showPicker?.()}
            >
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              {selectedLabel}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => handleDateInputChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              tabIndex={-1}
            />
          </div>
          <button
            onClick={() => navigateDay(1)}
            disabled={selectedDate >= today}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

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
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setExerciseName(""); setExerciseType(null); setShowSuggestions(false); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Exercise — {selectedLabel}</DialogTitle></DialogHeader>
            <form onSubmit={handleLog} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Exercise</Label>
                <div className="relative">
                  <Input
                    value={exerciseName}
                    onChange={(e) => { setExerciseName(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="e.g. Bench Press"
                    autoComplete="off"
                    required
                  />
                  {showSuggestions && exerciseName.length > 0 && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full top-full mt-1 rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {suggestions.map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onMouseDown={() => { setExerciseName(ex.name); setShowSuggestions(false); if (ex.type) setExerciseType(ex.type); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2"
                        >
                          <span>{ex.name}</span>
                          {ex.type ? (
                            <span className="text-xs text-muted-foreground shrink-0">{EXERCISE_TYPE_LABELS[ex.type]}</span>
                          ) : ex.muscleGroup ? (
                            <span className="text-xs text-muted-foreground shrink-0">{ex.muscleGroup}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Type <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="flex gap-1.5 flex-wrap">
                  {EXERCISE_TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExerciseType(exerciseType === type ? null : type)}
                      className={[
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                        exerciseType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      {EXERCISE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sets</Label>
                {sets.map((set, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{set.setNumber}</span>
                    <Input type="number" min={1} value={set.reps} onChange={(e) => updateSet(idx, "reps", parseInt(e.target.value) || 0)} className="w-20" placeholder="Reps" />
                    <Input type="number" min={0} step="2.5" value={set.weight} onChange={(e) => updateSet(idx, "weight", parseFloat(e.target.value) || 0)} className="w-20" placeholder="kg" />
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
                    <Input type="number" min={1} value={set.reps} onChange={(e) => updateEditSet(idx, "reps", parseInt(e.target.value) || 0)} className="w-20" placeholder="Reps" />
                    <Input type="number" min={0} step="2.5" value={set.weight} onChange={(e) => updateEditSet(idx, "weight", parseFloat(e.target.value) || 0)} className="w-20" placeholder="kg" />
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

                {/* Exercise configuration */}
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
                          {borrowDay !== selectedDayName && ` · logged for ${selectedLabel.toLowerCase()}`}
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
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 px-5 py-4 border-t bg-popover">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending || !activeTodaySource}
                >
                  {isPending ? "Logging…" : `Log for ${selectedLabel}`}
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
            {plans.length > 0 && (
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
                  {(() => {
                    const prev = lastSessionByExercise[name];
                    if (!prev) return null;
                    return (
                      <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="text-xs text-muted-foreground">Last · {fmtDate(prev.date)}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-medium">{prev.sets.length} sets</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{prev.sets.map((s) => `${s.weight} kg`).join(" / ")}</span>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: calendar — desktop only ────────────────────── */}
      <div className="hidden lg:block w-64 shrink-0">
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
                const isFuture = isValid && dateStr > today;
                const hasEntry = isValid && datesWithEntries.has(dateStr);
                return (
                  <div key={i} className="flex flex-col items-center py-0.5">
                    {isValid ? (
                      <button
                        onClick={() => {
                          if (isFuture) return;
                          setSelectedDate(dateStr);
                        }}
                        disabled={isFuture}
                        className={[
                          "relative w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary text-primary-foreground"
                            : isFuture ? "text-muted-foreground/40 cursor-default"
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

      {/* ── Clear day confirmation ─────────────────────────────── */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear workout log?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete all exercises logged for {selectedLabel}. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearDayConfirmed} disabled={isPending}>
              Clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
              onChange={(e) => onUpdate(i, "reps", parseInt(e.target.value) || 0)}
              className="w-16 h-8 text-sm text-center px-1"
            />
            <span className="text-xs text-muted-foreground shrink-0">reps</span>
            <Input
              type="number" min={0} step="2.5" value={set.weight}
              onChange={(e) => onUpdate(i, "weight", parseFloat(e.target.value) || 0)}
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
