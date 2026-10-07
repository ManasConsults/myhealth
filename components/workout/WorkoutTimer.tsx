"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  endWorkoutSession,
  removeWorkoutSession,
  startWorkoutExercise,
  startWorkoutSession,
  updateWorkoutExerciseTimes,
  updateWorkoutSessionTimes,
} from "@/lib/actions";
import { WorkoutSession } from "@/lib/types";
import { formatDuration, formatElapsed } from "@/lib/utils";
import { Clock, Pencil, Play, Square, Timer } from "lucide-react";

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

function toTimeInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtClock(iso: string): string {
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
  onRemove?: () => Promise<void>;
}

function TimeRangeDialog({ onClose, title, date, startedAt, endedAt, onSave, onRemove }: TimeRangeDialogProps) {
  const [start, setStart] = useState(() => toTimeInput(startedAt));
  const [end, setEnd] = useState(() => toTimeInput(endedAt));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!start) return;
    const startDate = new Date(`${date}T${start}`);
    const endDate: Date | null = end ? new Date(`${date}T${end}`) : null;
    // An end time earlier than the start means the workout ran past midnight
    if (endDate && endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
    startTransition(async () => {
      await onSave(startDate.toISOString(), endDate ? endDate.toISOString() : null);
      onClose();
    });
  }

  function handleRemove() {
    if (!onRemove) return;
    startTransition(async () => {
      await onRemove();
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
          <div className="flex gap-2">
            {onRemove && startedAt && (
              <Button type="button" variant="destructive" onClick={handleRemove} disabled={isPending}>
                Remove
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isPending || !start}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Gym session bar ──────────────────────────────────────────────────────────

interface SessionBarProps {
  date: string;
  session?: WorkoutSession;
  exerciseMs: number;
  now: number;
  onUpdate: () => void;
}

export function SessionBar({ date, session, exerciseMs, now, onUpdate }: SessionBarProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const running = !!session && !session.endedAt;
  const gymMs = durationMs(session?.startedAt, session?.endedAt, now);

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      onUpdate();
    });
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="session-bar">
      <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto sm:flex-1">
        <div className={["p-2 rounded-lg shrink-0", running ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"].join(" ")}>
          <Timer className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          {!session ? (
            <p className="text-sm font-medium">Gym time</p>
          ) : (
            <p className="text-sm font-medium tabular-nums">
              {running ? "At the gym · " : "Gym time · "}
              <span data-testid="gym-time">{running ? formatElapsed(gymMs ?? 0) : formatDuration(gymMs ?? 0)}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground tabular-nums">
            {!session
              ? "Not started"
              : running
                ? `Started ${fmtClock(session.startedAt)}`
                : `${fmtClock(session.startedAt)} – ${fmtClock(session.endedAt!)}`}
            {exerciseMs > 0 && <> · Exercise <span data-testid="exercise-time">{formatDuration(exerciseMs)}</span></>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
        {running ? (
          <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none" onClick={() => run(() => endWorkoutSession(date))} disabled={isPending}>
            <Square className="w-3.5 h-3.5" />End workout
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5 flex-1 sm:flex-none" onClick={() => run(() => startWorkoutSession(date))} disabled={isPending}>
            <Play className="w-3.5 h-3.5" />{session ? "Resume" : "Start workout"}
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={session ? "Edit gym time" : "Add gym time manually"}
          onClick={() => setEditOpen(true)}
          disabled={isPending}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>

      {editOpen && <TimeRangeDialog
        onClose={() => setEditOpen(false)}
        title="Gym time"
        date={date}
        startedAt={session?.startedAt}
        endedAt={session?.endedAt}
        onSave={async (s, e) => { await updateWorkoutSessionTimes(date, s, e); onUpdate(); }}
        onRemove={async () => { await removeWorkoutSession(date); onUpdate(); }}
      />}
    </div>
  );
}

// ── Per-exercise timer ───────────────────────────────────────────────────────

interface ExerciseTimerProps {
  date: string;
  exerciseName: string;
  startedAt?: string;
  endedAt?: string;
  completed: boolean;
  now: number;
  onUpdate: () => void;
}

export function ExerciseTimer({ date, exerciseName, startedAt, endedAt, completed, now, onUpdate }: ExerciseTimerProps) {
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
      ) : completed ? (
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
