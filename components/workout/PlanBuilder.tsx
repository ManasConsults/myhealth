"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createWorkoutPlan, editWorkoutPlan, removeWorkoutPlan, upsertExerciseInLibrary } from "@/lib/actions";
import {
  ExerciseLibrary,
  ExerciseType,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPE_OPTIONS,
  WorkoutDay,
  WorkoutPlan,
} from "@/lib/types";
import { Check, ChevronDown, ChevronUp, Dumbbell, Moon, Pencil, Plus, Trash2, X, Zap } from "lucide-react";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

interface Props {
  userId: string;
  plans: WorkoutPlan[];
  exerciseLibrary: ExerciseLibrary[];
  onUpdate: () => void;
}

export function PlanBuilder({ userId, plans, exerciseLibrary, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [planName, setPlanName] = useState("");
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [activeCategory, setActiveCategory] = useState<ExerciseType | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [customType, setCustomType] = useState<ExerciseType | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  function resetSheetState() {
    setPlanName("");
    setSchedule({});
    setLabels({});
    setSelectedDay("Monday");
    setActiveCategory(null);
    setCustomInput("");
    setCustomType(null);
  }

  function openSheet() {
    resetSheetState();
    setEditingPlanId(null);
    setOpen(true);
  }

  function openEditSheet(plan: WorkoutPlan) {
    const sch: Record<string, string[]> = {};
    const lbl: Record<string, string> = {};
    for (const day of plan.days) {
      sch[day.day] = [...day.exercises];
      if (day.label) lbl[day.day] = day.label;
    }
    setPlanName(plan.name);
    setSchedule(sch);
    setLabels(lbl);
    setSelectedDay(plan.days[0]?.day ?? "Monday");
    setActiveCategory(null);
    setCustomInput("");
    setCustomType(null);
    setEditingPlanId(plan.id);
    setOpen(true);
  }

  function activateDay(day: string) {
    setSchedule((prev) => ({ ...prev, [day]: prev[day] ?? [] }));
  }

  function setDayRest(day: string) {
    setSchedule((prev) => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
  }

  function toggleExercise(exercise: string) {
    const current = schedule[selectedDay] ?? [];
    const next = current.includes(exercise)
      ? current.filter((e) => e !== exercise)
      : [...current, exercise];
    setSchedule((prev) => ({ ...prev, [selectedDay]: next }));
  }

  function removeExercise(day: string, exercise: string) {
    setSchedule((prev) => ({ ...prev, [day]: (prev[day] ?? []).filter((e) => e !== exercise) }));
  }

  function addCustomExercise() {
    const val = customInput.trim();
    if (!val) return;
    const current = schedule[selectedDay] ?? [];
    if (!current.includes(val)) {
      setSchedule((prev) => ({ ...prev, [selectedDay]: [...(prev[selectedDay] ?? []), val] }));
    }
    setCustomInput("");
    void upsertExerciseInLibrary(val, customType ?? undefined);
    setCustomType(null);
  }

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    const days: WorkoutDay[] = DAYS_OF_WEEK
      .filter((d) => d in schedule && (schedule[d]?.length ?? 0) > 0)
      .map((d) => {
        const label = labels[d]?.trim();
        return { day: d, exercises: schedule[d]!, ...(label ? { label } : {}) };
      });
    startTransition(async () => {
      if (editingPlanId) {
        await editWorkoutPlan(editingPlanId, planName, days);
      } else {
        await createWorkoutPlan(userId, planName, days);
      }
      setOpen(false);
      onUpdate();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await removeWorkoutPlan(id);
      onUpdate();
    });
  }

  const isDayActive = selectedDay in schedule;
  const dayExercises = schedule[selectedDay] ?? [];
  const trainingDays = Object.keys(schedule).length;
  const isEditing = editingPlanId !== null;

  // Types that actually have exercises in the library
  const availableTypes = EXERCISE_TYPE_OPTIONS.filter(
    (t) => exerciseLibrary.some((ex) => ex.type === t)
  );

  const shownExercises = activeCategory
    ? exerciseLibrary.filter((ex) => ex.type === activeCategory)
    : exerciseLibrary;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Workout Plans</h3>
        <Button size="sm" className="gap-1.5" onClick={openSheet}>
          <Plus className="w-4 h-4" />New Plan
        </Button>
      </div>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b">
            <SheetTitle>{isEditing ? "Edit Plan" : "New Workout Plan"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* Plan name */}
              <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. PPL Split, 5-Day Hypertrophy"
                  required
                />
              </div>

              {/* Week grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Weekly Schedule</Label>
                  <span className="text-xs text-muted-foreground">
                    {trainingDays} training {trainingDays === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const active = day in schedule;
                    const selected = day === selectedDay;
                    const count = schedule[day]?.length ?? 0;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={[
                          "flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm scale-105"
                            : active
                            ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                            : "bg-muted text-muted-foreground hover:bg-muted/70",
                        ].join(" ")}
                      >
                        <span>{DAY_SHORT[day].slice(0, 2)}</span>
                        <span className={[
                          "text-[9px] font-medium leading-none",
                          selected ? "text-primary-foreground/70" : active ? "text-primary/60" : "text-muted-foreground/60",
                        ].join(" ")}>
                          {active ? (count > 0 ? `${count}ex` : "on") : "rest"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day editor */}
              <div className="rounded-xl border bg-muted/30 overflow-hidden">
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
                  <div className="flex items-center gap-2">
                    {isDayActive ? (
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                        <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{selectedDay}</p>
                      <p className="text-xs text-muted-foreground leading-none mt-0.5">
                        {isDayActive
                          ? `${dayExercises.length} exercise${dayExercises.length !== 1 ? "s" : ""}`
                          : "Rest day"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={isDayActive ? "outline" : "default"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => isDayActive ? setDayRest(selectedDay) : activateDay(selectedDay)}
                  >
                    {isDayActive ? "Set Rest" : "Train"}
                  </Button>
                </div>

                {isDayActive ? (
                  <div className="p-4 space-y-4">
                    {/* Workout label */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Label <span className="font-normal">(optional)</span></Label>
                      <Input
                        value={labels[selectedDay] ?? ""}
                        onChange={(e) => setLabels((prev) => ({ ...prev, [selectedDay]: e.target.value }))}
                        placeholder="e.g. Chest, Pull Day, Legs"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Selected exercises */}
                    {dayExercises.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {dayExercises.map((ex) => (
                          <span
                            key={ex}
                            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                          >
                            {ex}
                            <button
                              type="button"
                              onClick={() => removeExercise(selectedDay, ex)}
                              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Pick exercises from the library below
                      </p>
                    )}

                    <Separator />

                    {/* Exercise library picker */}
                    <div className="space-y-3">
                      {/* Type filter chips */}
                      {availableTypes.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setActiveCategory(null)}
                            className={[
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                              activeCategory === null
                                ? "bg-foreground text-background border-foreground"
                                : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
                            ].join(" ")}
                          >
                            All
                          </button>
                          {availableTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setActiveCategory(type)}
                              className={[
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                activeCategory === type
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
                              ].join(" ")}
                            >
                              {EXERCISE_TYPE_LABELS[type]}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Exercise chips */}
                      {shownExercises.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {shownExercises.map((ex) => {
                            const picked = dayExercises.includes(ex.name);
                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => toggleExercise(ex.name)}
                                className={[
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                  picked
                                    ? "bg-primary/10 text-primary border-primary/40 shadow-sm"
                                    : "bg-background text-foreground border-border hover:border-primary/30 hover:bg-primary/5",
                                ].join(" ")}
                              >
                                {picked && <Check className="w-3 h-3 shrink-0" />}
                                {ex.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          {exerciseLibrary.length === 0
                            ? "Library is empty — log workouts to build it up."
                            : "No exercises in this category."}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Custom exercise */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder="Add custom exercise…"
                          className="flex-1 h-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addCustomExercise(); }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          onClick={addCustomExercise}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {customInput.trim().length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">Type:</span>
                          {EXERCISE_TYPE_OPTIONS.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setCustomType(customType === type ? null : type)}
                              className={[
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                                customType === type
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
                              ].join(" ")}
                            >
                              {EXERCISE_TYPE_LABELS[type]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center space-y-2">
                    <Moon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Rest day — tap &quot;Train&quot; to add exercises</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer */}
            <div className="px-5 py-4 border-t bg-popover">
              <Button
                type="submit"
                className="w-full"
                disabled={isPending || !planName.trim() || trainingDays === 0}
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
            <Dumbbell className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">No workout plans yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a plan to structure your weekly training
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
            const activeDayNames = new Set(plan.days.map((d) => d.day));

            return (
              <Card key={plan.id}>
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm leading-tight">{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.days.length} training {plan.days.length === 1 ? "day" : "days"} ·{" "}
                        {plan.days.reduce((sum, d) => sum + d.exercises.length, 0)} exercises
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      >
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
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

                  {/* Week strip */}
                  <div className="flex gap-1 mt-3">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = activeDayNames.has(day);
                      return (
                        <div
                          key={day}
                          title={day}
                          className={[
                            "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors",
                            active ? "bg-primary" : "bg-muted",
                          ].join(" ")}
                        >
                          <span className={[
                            "text-[10px] font-semibold leading-none",
                            active ? "text-primary-foreground" : "text-muted-foreground/60",
                          ].join(" ")}>
                            {DAY_SHORT[day][0]}
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
                      {plan.days.map((day, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <p className="text-xs font-semibold text-foreground">{day.day}</p>
                            {day.label && (
                              <span className="text-xs text-muted-foreground">— {day.label}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 pl-3.5">
                            {day.exercises.map((ex, j) => (
                              <Badge key={j} variant="outline" className="text-xs font-normal">
                                {ex}
                              </Badge>
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
