"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { finishForgottenExercises, startWorkoutExercise, updateWorkoutExerciseTimes } from "@/lib/actions";
import { WorkoutLogEntry } from "@/lib/types";
import { formatDuration, formatElapsed } from "@/lib/utils";
import { AlarmClockOff, Clock, Play, Timer } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Ticks every second only while something is running, so idle pages don't re-render.
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function durationMs(startedAt: string | undefined, endedAt: string | undefined, now: number): number | null {
  if (!startedAt) return null;
  return (endedAt ? Date.parse(endedAt) : now) - Date.parse(startedAt);
}

interface ExerciseTime {
  name: string;
  startedAt?: string;
  endedAt?: string;
}

// Times are written to every entry of an exercise at once, so one timed entry per exercise name is
// the exercise's time — summing raw entries would double-count exercises logged more than once.
export function exerciseTimes(entries: WorkoutLogEntry[]): ExerciseTime[] {
  const byName = new Map<string, ExerciseTime>();
  for (const e of entries) {
    const current = byName.get(e.exerciseName);
    if (!current || (!current.startedAt && e.startedAt)) {
      byName.set(e.exerciseName, { name: e.exerciseName, startedAt: e.startedAt, endedAt: e.endedAt });
    }
  }
  return [...byName.values()];
}

export interface DayTiming {
  totalMs: number;      // sum of exercise durations — this is the gym time
  firstStart?: string;  // start of the first exercise
  lastEnd?: string;     // end of the last exercise; absent while one is still running
  running: boolean;
}

// For a single day's entries
export function dayTiming(entries: WorkoutLogEntry[], now: number): DayTiming {
  const timed = exerciseTimes(entries).filter((t) => t.startedAt);
  const running = timed.some((t) => !t.endedAt);
  // ISO-8601 UTC strings sort chronologically
  const starts = timed.map((t) => t.startedAt!).sort();
  const ends = timed.map((t) => t.endedAt).filter((t): t is string => !!t).sort();
  return {
    totalMs: timed.reduce((sum, t) => sum + (durationMs(t.startedAt, t.endedAt, now) ?? 0), 0),
    firstStart: starts[0],
    lastEnd: running ? undefined : ends.at(-1),
    running,
  };
}

function toTimeInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Edit-times dialog ────────────────────────────────────────────────────────

// Mount only while open: the fields initialise from the latest saved times each time it opens.
interface TimeRangeDialogProps {
  onClose: () => void;
  title: string;
  date: string;
  startedAt?: string;
  endedAt?: string;
  onSave: (startedAt: string, endedAt: string | null) => Promise<void>;
}

function TimeRangeDialog({ onClose, title, date, startedAt, endedAt, onSave }: TimeRangeDialogProps) {
  const [start, setStart] = useState(() => toTimeInput(startedAt));
  const [end, setEnd] = useState(() => toTimeInput(endedAt));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!start) return;
    const startDate = new Date(`${date}T${start}`);
    const endDate: Date | null = end ? new Date(`${date}T${end}`) : null;
    // An end time earlier than the start means the exercise ran past midnight
    if (endDate && endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
    startTransition(async () => {
      await onSave(startDate.toISOString(), endDate ? endDate.toISOString() : null);
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="time-start">Start</Label>
              <Input id="time-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time-end">End</Label>
              <Input id="time-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Leave End empty if it&apos;s still in progress.</p>
          <Button type="submit" className="w-full" disabled={isPending || !start}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Gym time summary ─────────────────────────────────────────────────────────

export function GymTimeBar({ timing }: { timing: DayTiming }) {
  const { totalMs, firstStart, lastEnd, running } = timing;
  return (
    <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-2.5" data-testid="gym-time-bar">
      <div className={["p-2 rounded-lg shrink-0", running ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"].join(" ")}>
        <Timer className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium tabular-nums">
          Gym time
          {firstStart && (
            <> · <span data-testid="gym-time">{running ? formatElapsed(totalMs) : formatDuration(totalMs)}</span></>
          )}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums" data-testid="gym-range">
          {!firstStart
            ? "Start an exercise to track your time"
            : running
              ? `Started ${fmtClock(firstStart)} · in progress`
              : `${fmtClock(firstStart)} – ${fmtClock(lastEnd!)}`}
        </p>
      </div>
    </div>
  );
}

// ── Per-exercise timer ───────────────────────────────────────────────────────

interface ExerciseTimerProps {
  date: string;
  isToday: boolean;
  exerciseName: string;
  startedAt?: string;
  endedAt?: string;
  completed: boolean;
  now: number;
  onUpdate: () => void;
}

export function ExerciseTimer({ date, isToday, exerciseName, startedAt, endedAt, completed, now, onUpdate }: ExerciseTimerProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ms = durationMs(startedAt, endedAt, now);
  const running = !!startedAt && !endedAt;

  function handleStart() {
    startTransition(async () => {
      await startWorkoutExercise(date, exerciseName);
      onUpdate();
    });
  }

  const chipCls = "min-h-11 -my-2 px-2 flex items-center gap-1.5 rounded-lg text-xs font-medium tabular-nums transition-colors disabled:opacity-50";

  return (
    <>
      {ms !== null ? (
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label={`${exerciseName} time ${running ? formatElapsed(ms) : formatDuration(ms)}, edit`}
          className={[chipCls, running ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"].join(" ")}
        >
          <Timer className="w-4 h-4" />
          <span data-testid="exercise-timer">{running ? formatElapsed(ms) : formatDuration(ms)}</span>
        </button>
      ) : completed || !isToday ? (
        // Start stamps the current time, so finished or past-day exercises get manual entry instead
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label={`Add time for ${exerciseName}`}
          className={[chipCls, "text-muted-foreground hover:bg-muted hover:text-foreground"].join(" ")}
        >
          <Clock className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          disabled={isPending}
          aria-label={`Start ${exerciseName}`}
          className={[chipCls, "text-muted-foreground hover:bg-muted hover:text-foreground"].join(" ")}
        >
          <Play className="w-4 h-4" />Start
        </button>
      )}

      {editOpen && <TimeRangeDialog
        onClose={() => setEditOpen(false)}
        title={`${exerciseName} time`}
        date={date}
        startedAt={startedAt}
        endedAt={endedAt}
        onSave={async (s, e) => { await updateWorkoutExerciseTimes(date, exerciseName, s, e); onUpdate(); }}
      />}
    </>
  );
}

// ── Forgotten exercise timers ────────────────────────────────────────────────

// No single exercise takes this long — a timer still running past it is a forgotten "Mark done"
const FORGOTTEN_EXERCISE_MS = 2 * 60 * 60 * 1000;

interface ForgottenWorkout {
  date: string;
  startedAt: string;     // earliest still-running start that day — anchors the end-time picker
  lastActivity?: string; // last exercise finished after that — the likeliest real end
}

export function findForgottenWorkout(log: WorkoutLogEntry[], today: string, now: number): ForgottenWorkout | null {
  const forgottenDates = new Set(
    log
      .filter((e) => e.startedAt && !e.endedAt && (e.date < today || now - Date.parse(e.startedAt) > FORGOTTEN_EXERCISE_MS))
      .map((e) => e.date),
  );
  // Oldest first; once it's resolved the next one (if any) surfaces
  const date = [...forgottenDates].sort()[0];
  if (!date) return null;

  const times = exerciseTimes(log.filter((e) => e.date === date));
  const startedAt = times.filter((t) => t.startedAt && !t.endedAt).map((t) => t.startedAt!).sort()[0];
  const lastActivity = times.map((t) => t.endedAt).filter((t): t is string => !!t && t > startedAt).sort().at(-1);
  return { date, startedAt, lastActivity };
}

interface ForgottenWorkoutBannerProps {
  log: WorkoutLogEntry[];
  today: string;
  now: number;
  onUpdate: () => void;
}

export function ForgottenWorkoutBanner({ log, today, now, onUpdate }: ForgottenWorkoutBannerProps) {
  const [dismissedDate, setDismissedDate] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const forgotten = findForgottenWorkout(log, today, now);
  if (!forgotten || dismissedDate === forgotten.date) return null;
  const { date, startedAt, lastActivity } = forgotten;
  const isToday = date === today;

  function finish(endedAt: string) {
    startTransition(async () => {
      await finishForgottenExercises(date, endedAt);
      onUpdate();
    });
  }

  return (
    <div role="alert" className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-3" data-testid="forgotten-banner">
      <div className="flex items-start gap-2.5">
        <AlarmClockOff className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Forgot to finish an exercise?</p>
          <p className="text-xs text-muted-foreground">
            {isToday
              ? `A timer has been running since ${fmtClock(startedAt)}.`
              : `A timer from ${new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} is still running.`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {lastActivity && (
          <Button size="sm" className="flex-1 sm:flex-none" onClick={() => finish(lastActivity)} disabled={isPending}>
            End at {fmtClock(lastActivity)}
          </Button>
        )}
        <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => setPickOpen(true)} disabled={isPending}>
          Choose end time
        </Button>
        {isToday && (
          <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" onClick={() => setDismissedDate(date)} disabled={isPending}>
            Still going
          </Button>
        )}
      </div>

      {pickOpen && (
        <EndTimeDialog
          date={date}
          startedAt={startedAt}
          defaultEnd={lastActivity}
          onClose={() => setPickOpen(false)}
          onSave={async (endedAt) => { await finishForgottenExercises(date, endedAt); onUpdate(); }}
        />
      )}
    </div>
  );
}

interface EndTimeDialogProps {
  date: string;
  startedAt: string;
  defaultEnd?: string;
  onClose: () => void;
  onSave: (endedAt: string) => Promise<void>;
}

function EndTimeDialog({ date, startedAt, defaultEnd, onClose, onSave }: EndTimeDialogProps) {
  const [end, setEnd] = useState(() => toTimeInput(defaultEnd));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!end) return;
    const endDate = new Date(`${date}T${end}`);
    // Earlier than the start means the exercise ran past midnight
    if (endDate <= new Date(startedAt)) endDate.setDate(endDate.getDate() + 1);
    startTransition(async () => {
      await onSave(endDate.toISOString());
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>When did you finish?</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="forgotten-end">End time</Label>
            <Input id="forgotten-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
            <p className="text-xs text-muted-foreground">Started {fmtClock(startedAt)}. Stops every exercise still running that day.</p>
          </div>
          <Button type="submit" className="w-full" disabled={isPending || !end}>
            {isPending ? "Saving…" : "Stop timers"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
