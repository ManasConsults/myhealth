"use client";

import { useState, useTransition, useEffect } from "react";
import { MessageSquare, Send, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  submitFeedback,
  fetchUserFeedback,
  deleteFeedback,
} from "@/lib/actions";
import type { Feedback, FeedbackCategory } from "@/lib/types";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-green-500/10 text-green-600 dark:text-green-400",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"submit" | "mine">("submit");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [list, setList] = useState<Feedback[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && tab === "mine") {
      void fetchUserFeedback().then(setList);
    }
  }, [open, tab]);

  function handleSubmit() {
    if (!title.trim() || !message.trim()) return;
    startTransition(async () => {
      await submitFeedback(title.trim(), category, message.trim());
      setTitle("");
      setCategory("bug");
      setMessage("");
      setSubmitted(true);
      const fresh = await fetchUserFeedback();
      setList(fresh);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFeedback(id);
      setList((prev) => prev.filter((f) => f.id !== id));
    });
  }

  function handleTabChange(value: string) {
    const next = value as "submit" | "mine";
    setTab(next);
    setSubmitted(false);
    if (next === "mine") {
      void fetchUserFeedback().then(setList);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedback
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="submit" className="flex-1 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Submit
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex-1">
              My Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="mt-4 space-y-4">
            {submitted ? (
              <div className="text-center py-6 space-y-2">
                <p className="font-medium">Thanks for your feedback!</p>
                <p className="text-sm text-muted-foreground">We&apos;ll review it shortly.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSubmitted(false)}
                >
                  Submit another
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fb-title">Title</Label>
                  <Input
                    id="fb-title"
                    placeholder="Brief summary"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fb-category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as FeedbackCategory)}
                  >
                    <SelectTrigger id="fb-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {FEEDBACK_CATEGORY_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fb-message">Message</Label>
                  <Textarea
                    id="fb-message"
                    placeholder="Describe the issue or suggestion..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={isPending || !title.trim() || !message.trim()}
                  onClick={handleSubmit}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isPending ? "Sending..." : "Send Feedback"}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No feedback submitted yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {list.map((fb) => (
                  <li key={fb.id} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{fb.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {FEEDBACK_CATEGORY_LABELS[fb.category]} ·{" "}
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            STATUS_VARIANTS[fb.status]
                          )}
                        >
                          {FEEDBACK_STATUS_LABELS[fb.status]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(fb.id)}
                          disabled={isPending}
                          aria-label="Delete feedback"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{fb.message}</p>
                    {fb.adminNote && (
                      <>
                        <Separator />
                        <p className="text-xs">
                          <span className="font-medium">Admin note:</span>{" "}
                          {fb.adminNote}
                        </p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
