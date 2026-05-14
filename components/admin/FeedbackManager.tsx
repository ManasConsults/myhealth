"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateFeedbackStatus, deleteFeedback } from "@/lib/actions";
import type { Feedback, FeedbackStatus } from "@/lib/types";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<FeedbackStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-green-500/10 text-green-600 dark:text-green-400",
};

interface Props {
  feedback: Feedback[];
  onUpdate: () => void;
}

interface RowState {
  status: FeedbackStatus;
  note: string;
  dirty: boolean;
}

export function FeedbackManager({ feedback, onUpdate }: Props) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      feedback.map((f) => [f.id, { status: f.status, note: f.adminNote ?? "", dirty: false }])
    )
  );
  const [isPending, startTransition] = useTransition();

  // Sync new feedback items when props change
  const merged: Record<string, RowState> = {};
  for (const f of feedback) {
    merged[f.id] = rows[f.id] ?? {
      status: f.status,
      note: f.adminNote ?? "",
      dirty: false,
    };
  }

  function setStatus(id: string, status: FeedbackStatus) {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], status, dirty: true },
    }));
  }

  function setNote(id: string, note: string) {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], note, dirty: true },
    }));
  }

  function handleSave(id: string) {
    const row = rows[id];
    if (!row) return;
    startTransition(async () => {
      await updateFeedbackStatus(id, row.status, row.note || undefined);
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], dirty: false } }));
      onUpdate();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFeedback(id);
      onUpdate();
    });
  }

  if (feedback.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No feedback yet.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {feedback.map((fb) => {
        const row = merged[fb.id] ?? { status: fb.status, note: fb.adminNote ?? "", dirty: false };
        return (
          <li key={fb.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium text-sm truncate">{fb.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fb.username} · {FEEDBACK_CATEGORY_LABELS[fb.category]} ·{" "}
                  {new Date(fb.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(fb.id)}
                disabled={isPending}
                aria-label="Delete feedback"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fb.message}</p>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Status</span>
                <Select
                  value={row.status}
                  onValueChange={(v) => setStatus(fb.id, v as FeedbackStatus)}
                >
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          STATUS_VARIANTS[row.status]
                        )}
                      >
                        {FEEDBACK_STATUS_LABELS[row.status]}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {FEEDBACK_STATUS_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Admin note (optional)"
                rows={2}
                className="text-xs resize-none"
                value={row.note}
                onChange={(e) => setNote(fb.id, e.target.value)}
              />

              {row.dirty && (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleSave(fb.id)}
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
