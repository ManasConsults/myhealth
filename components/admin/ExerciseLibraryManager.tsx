"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createExerciseInLibrary,
  deleteExerciseFromLibrary,
  updateExerciseInLibrary,
} from "@/lib/actions";
import {
  ExerciseLibrary,
  ExerciseType,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPE_OPTIONS,
} from "@/lib/types";

interface Props {
  library: ExerciseLibrary[];
  onUpdate: () => void;
}

const EMPTY_FORM = { name: "", muscleGroup: "", type: null as ExerciseType | null, instructions: "" };

export function ExerciseLibraryManager({ library, onUpdate }: Props) {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExerciseLibrary | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  const filtered = library.filter(
    (ex) =>
      ex.name.toLowerCase().includes(query.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(query.toLowerCase()),
  );

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(ex: ExerciseLibrary) {
    setEditTarget(ex);
    setForm({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      type: ex.type ?? null,
      instructions: ex.instructions ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (editTarget) {
        await updateExerciseInLibrary(editTarget.id, {
          name: form.name.trim(),
          muscleGroup: form.muscleGroup.trim(),
          type: form.type,
          instructions: form.instructions.trim() || null,
        });
      } else {
        await createExerciseInLibrary(
          form.name.trim(),
          form.muscleGroup.trim(),
          form.type ?? undefined,
          form.instructions.trim() || undefined,
        );
      }
      setDialogOpen(false);
      onUpdate();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExerciseFromLibrary(id);
      onUpdate();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name or muscle group…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" className="gap-1.5 ml-auto shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" />Add Exercise
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Bench Press"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Muscle Group{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={form.muscleGroup}
                onChange={(e) => setForm((p) => ({ ...p, muscleGroup: e.target.value }))}
                placeholder="e.g. Chest"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Type{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="flex gap-1.5 flex-wrap">
                {EXERCISE_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: p.type === type ? null : type }))}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                      form.type === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    {EXERCISE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                Instructions{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                value={form.instructions}
                onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                placeholder="Form cues, notes…"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving…" : editTarget ? "Save Changes" : "Add Exercise"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {query ? "No exercises match your search." : "No exercises in the library yet."}
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Muscle Group</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{ex.name}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{ex.muscleGroup || "—"}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {ex.muscleGroup || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {ex.type ? (
                      <Badge variant="secondary" className="text-xs">
                        {EXERCISE_TYPE_LABELS[ex.type]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(ex)}
                        disabled={isPending}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(ex.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {library.length} exercise{library.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}
