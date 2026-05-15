"use client";

import { useState, useTransition } from "react";
import { Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-36">User</TableHead>
          <TableHead className="w-28">Category</TableHead>
          <TableHead>Title / Message</TableHead>
          <TableHead className="w-36">Status</TableHead>
          <TableHead>Admin Note</TableHead>
          <TableHead className="w-20 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {feedback.map((fb) => {
          const row = merged[fb.id] ?? { status: fb.status, note: fb.adminNote ?? "", dirty: false };
          return (
            <TableRow key={fb.id}>
              <TableCell>
                <p className="text-sm font-medium">{fb.username}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(fb.createdAt).toLocaleDateString()}
                </p>
              </TableCell>

              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {FEEDBACK_CATEGORY_LABELS[fb.category]}
                </span>
              </TableCell>

              <TableCell className="max-w-xs whitespace-normal">
                <p className="text-sm font-medium">{fb.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{fb.message}</p>
              </TableCell>

              <TableCell>
                <Select
                  value={row.status}
                  onValueChange={(v) => setStatus(fb.id, v as FeedbackStatus)}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
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
              </TableCell>

              <TableCell className="max-w-xs">
                <Input
                  placeholder="Admin note (optional)"
                  className="h-7 text-xs"
                  value={row.note}
                  onChange={(e) => setNote(fb.id, e.target.value)}
                />
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {row.dirty && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary"
                      onClick={() => handleSave(fb.id)}
                      disabled={isPending}
                      aria-label="Save"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(fb.id)}
                    disabled={isPending}
                    aria-label="Delete feedback"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
