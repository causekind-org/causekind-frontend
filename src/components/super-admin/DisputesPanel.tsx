"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  adminListDisputes, adminResolveDispute,
  type PostDeliveryIssueResponse,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";

/** Queue of user-reported post-delivery issues (see HandoverService.reportIssue) —
 * previously nothing ever resolved these; adminResolution/resolvedAt sat unused. */
export function DisputesPanel() {
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [issues, setIssues] = useState<PostDeliveryIssueResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    adminListDisputes(status)
      .then(setIssues)
      .catch(() => toast.error("Failed to load disputes."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status]);

  async function resolve(id: number) {
    const resolution = drafts[id]?.trim();
    if (!resolution) { toast.error("Enter a resolution note first."); return; }
    setResolvingId(id);
    try {
      await adminResolveDispute(id, resolution);
      toast.success("Dispute resolved.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve dispute.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["open", "resolved", "all"] as const).map(s => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => setStatus(s)}>
            {s === "open" ? "Open" : s === "resolved" ? "Resolved" : "All"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">No disputes in this view.</p>
      ) : (
        <div className="space-y-3">
          {issues.map(issue => (
            <Card key={issue.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">
                      {issue.offerTitle ?? `Offer #${issue.offerId}`}
                      <span className="text-xs text-muted-foreground ml-2">{issue.issueType}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported by {issue.reportedByEmail} · {new Date(issue.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={issue.resolvedAt ? "default" : "secondary"}>
                    {issue.resolvedAt ? "Resolved" : "Open"}
                  </Badge>
                </div>
                <p className="text-sm">{issue.description}</p>
                {issue.evidenceUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {issue.evidenceUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt={`Evidence ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border" />
                    ))}
                  </div>
                )}

                {issue.resolvedAt ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Resolved {new Date(issue.resolvedAt).toLocaleString()}</p>
                      <p className="text-muted-foreground">{issue.adminResolution}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Textarea
                      rows={2}
                      placeholder="How was this resolved?"
                      value={drafts[issue.id] ?? ""}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [issue.id]: e.target.value }))}
                    />
                    <Button
                      onClick={() => resolve(issue.id)}
                      disabled={resolvingId === issue.id}
                      className="shrink-0"
                    >
                      {resolvingId === issue.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resolve"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
