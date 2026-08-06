"use client";

import { useEffect, useState } from "react";
import { myTasks, respondToTask, type MyTask } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, AlertTriangle, Check } from "lucide-react";

/**
 * "We need something from you" — the user's side of an information request.
 *
 * <p>Renders nothing at all when there is nothing outstanding, so it can sit
 * unconditionally on the dashboard without adding an empty card to the common
 * case.
 *
 * <p>Unlike the console panels this uses the app's own shadcn components, because
 * it lives in the user-facing app where those resolve correctly. Only the Super
 * Admin console rolls its own theme.
 */
export function MyTasksCard() {
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    myTasks()
      .then(setTasks)
      // Silent: this is a supplementary card, and a toast about a panel the user
      // did not ask for is noise on a page that has its own job.
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !tasks || tasks.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/[0.06]">
      <header className="mb-3 flex items-center gap-2">
        <ClipboardList className="size-4 text-amber-700 dark:text-amber-400" />
        <h2 className="text-sm font-semibold">
          We need something from you
          <span className="ml-1.5 font-normal text-muted-foreground">
            ({tasks.length} {tasks.length === 1 ? "request" : "requests"})
          </span>
        </h2>
      </header>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.requestId}
            task={task}
            onDone={(updated) =>
              setTasks((prev) =>
                (prev ?? [])
                  .map((t) => (t.requestId === updated.requestId ? updated : t))
                  // A fully answered request drops out of the list; it is no
                  // longer something the user has to do.
                  .filter((t) => t.status !== "ANSWERED")
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function TaskItem({ task, onDone }: { task: MyTask; onDone: (t: MyTask) => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const unanswered = task.items.filter((i) => !i.answered);
  const requiredLeft = unanswered.filter((i) => i.required).length;

  async function submit() {
    const filled = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v.trim().length > 0)
    );
    if (Object.keys(filled).length === 0) {
      toast.error("Fill in at least one answer first.");
      return;
    }
    setSaving(true);
    try {
      // Partial answers are kept, so a long request can be finished later
      // rather than lost by submitting early.
      const updated = await respondToTask(
        task.requestId,
        Object.fromEntries(Object.entries(filled).map(([k, v]) => [Number(k), v]))
      );
      onDone(updated);
      toast.success(
        updated.status === "ANSWERED" ? "Thanks — that's everything we needed." : "Saved."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">{task.instructions}</p>
        {task.overdue && (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertTriangle className="size-3" /> Overdue
          </Badge>
        )}
      </div>

      {task.dueAt && !task.overdue && (
        <p className="mt-1 text-xs text-muted-foreground">
          Please reply by {new Date(task.dueAt).toLocaleDateString()}
        </p>
      )}

      <div className="mt-3 space-y-2.5">
        {task.items.map((item) =>
          item.answered ? (
            <p key={item.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
              {item.label}
            </p>
          ) : (
            <div key={item.id}>
              <label htmlFor={`item-${item.id}`} className="text-xs font-medium">
                {item.label}
                {!item.required && <span className="text-muted-foreground"> (optional)</span>}
              </label>
              {item.itemType === "CONFIRMATION" ? (
                <div className="mt-1 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={answers[item.id] === "true" ? "default" : "outline"}
                    onClick={() => setAnswers((a) => ({ ...a, [item.id]: "true" }))}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={answers[item.id] === "false" ? "default" : "outline"}
                    onClick={() => setAnswers((a) => ({ ...a, [item.id]: "false" }))}
                  >
                    No
                  </Button>
                </div>
              ) : item.itemType === "TEXT" ? (
                <Textarea
                  id={`item-${item.id}`}
                  rows={2}
                  className="mt-1"
                  value={answers[item.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [item.id]: e.target.value }))}
                />
              ) : (
                // DOCUMENT and PHOTO take a link for now. Direct upload reuses the
                // existing verification-document pipeline and is a separate piece
                // of work; asking for a link is honest rather than a broken button.
                <Input
                  id={`item-${item.id}`}
                  className="mt-1"
                  placeholder="Paste a link to the file"
                  value={answers[item.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [item.id]: e.target.value }))}
                />
              )}
            </div>
          )
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {requiredLeft > 1 ? "Save answers" : "Send"}
        </Button>
        {requiredLeft > 0 && (
          <span className="text-xs text-muted-foreground">
            {requiredLeft} still needed
          </span>
        )}
      </div>
    </div>
  );
}
