import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText, Send, ExternalLink } from "lucide-react";
import { CadetCombobox } from "../components/CadetCombobox";
import { PmtMultiSelect } from "../components/PmtMultiSelect";
import { uploadMemoPdf } from "../lib/storage";
import { ABSENCE_REASONS } from "../domain/constants";
import type { AbsenceMemoStatus, AbsenceReason } from "../domain/constants";
import type { AbsenceMemo, PmtEvent, RosterPerson } from "../domain/types";
import type { AbsenceMemoInput } from "../hooks/useAbsenceMemos";

interface Props {
  roster: RosterPerson[];
  events: PmtEvent[];
  memos: AbsenceMemo[];
  createMemo: (input: AbsenceMemoInput) => Promise<AbsenceMemo>;
  updateMemo: (id: string, input: Partial<AbsenceMemoInput>) => Promise<void>;
  applyMemoDecision: (cadetId: string, pmtEventIds: string[], newStatus: "AE" | "A") => Promise<number>;
}

type Tab = "submit" | "review";

function StatusBadge({ status }: { status: AbsenceMemoStatus }) {
  const variant = status === "Accepted" ? "success" : status === "Rejected" ? "destructive" : status === "Returned" ? "warning" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export function AbsenceMemosScreen({ roster, events, memos, createMemo, updateMemo, applyMemoDecision }: Props) {
  const [tab, setTab] = useState<Tab>("submit");

  const [cadetId, setCadetId] = useState("");
  const [pmtEventIds, setPmtEventIds] = useState<string[]>([]);
  const [reason, setReason] = useState<AbsenceReason>("Personal");
  const [medicalDocSent, setMedicalDocSent] = useState(false);
  const [file, setFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const [reviewingId, setReviewingId] = useState<string | undefined>();
  const [reviewerName, setReviewerName] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [deciding, setDeciding] = useState(false);

  const pendingMemos = useMemo(() => memos.filter((m) => m.status === "Pending").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [memos]);
  const decidedMemos = useMemo(() => memos.filter((m) => m.status !== "Pending").sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [memos]);

  const resetForm = () => {
    setCadetId("");
    setPmtEventIds([]);
    setReason("Personal");
    setMedicalDocSent(false);
    setFile(undefined);
  };

  const handleSubmit = async () => {
    const person = roster.find((p) => p.id === cadetId);
    if (!person || pmtEventIds.length === 0) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      let pdfUrl: string | undefined;
      let pdfFileName: string | undefined;
      if (file) {
        const uploaded = await uploadMemoPdf(file, "absenceMemos", person.id);
        pdfUrl = uploaded.url;
        pdfFileName = uploaded.fileName;
      }
      await createMemo({
        cadetId: person.id,
        cadetName: person.name,
        asClass: person.asClass,
        pmtEventIds,
        reason,
        medicalDocSent,
        pdfUrl,
        pdfFileName,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        reviewedAt: undefined,
        reviewedBy: undefined,
        reviewNotes: "",
        returnReason: undefined,
        attendanceUpdatedAt: undefined,
      });
      resetForm();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit memo.");
    } finally {
      setSubmitting(false);
    }
  };

  const openReview = (memo: AbsenceMemo) => {
    setReviewingId(memo.id);
    setReviewerName("");
    setReviewNotes("");
    setReturnReason("");
  };

  const decide = async (memo: AbsenceMemo, decision: "Accepted" | "Rejected" | "Returned") => {
    setDeciding(true);
    try {
      const now = new Date().toISOString();
      let attendanceUpdatedAt: string | undefined;
      if (decision === "Accepted" || decision === "Rejected") {
        await applyMemoDecision(memo.cadetId, memo.pmtEventIds, decision === "Accepted" ? "AE" : "A");
        attendanceUpdatedAt = now;
      }
      await updateMemo(memo.id, {
        status: decision,
        reviewedAt: now,
        reviewedBy: reviewerName.trim() || undefined,
        reviewNotes,
        returnReason: decision === "Returned" ? returnReason : undefined,
        attendanceUpdatedAt,
      });
      setReviewingId(undefined);
    } finally {
      setDeciding(false);
    }
  };

  const eventLabel = (id: string) => {
    const e = events.find((ev) => ev.id === id);
    return e ? `${e.eventType} ${new Date(e.eventDate).toLocaleDateString()}` : "deleted PMT";
  };

  const reviewing = memos.find((m) => m.id === reviewingId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <FileText className="h-5 w-5 text-primary" />
          Absence Memos
        </h2>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="submit">Submit</TabsTrigger>
            <TabsTrigger value="review">
              Review Queue
              {pendingMemos.length > 0 && (
                <Badge variant="destructive" className="ml-1.5">
                  {pendingMemos.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "submit" ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>New Absence Memo</CardTitle>
            <CardDescription>Covers every PMT missed for one absence -- pick all of them here rather than filing one memo per PMT.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cadet</Label>
              <CadetCombobox roster={roster} value={cadetId} onChange={setCadetId} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label>PMT(s) missed</Label>
              <PmtMultiSelect events={events} value={pmtEventIds} onChange={setPmtEventIds} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as AbsenceReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABSENCE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={medicalDocSent} onChange={(e) => setMedicalDocSent(e.target.checked)} />
              Medical documentation sent separately
            </label>
            <div className="space-y-1.5">
              <Label>Memo PDF</Label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="block w-full text-sm text-muted-foreground"
              />
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Button onClick={handleSubmit} disabled={submitting || !cadetId || pmtEventIds.length === 0}>
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit Memo"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Table aria-label="Pending absence memos">
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Cadet</TableHead>
                <TableHead>PMTs</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingMemos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell>{m.cadetName}</TableCell>
                  <TableCell>{m.pmtEventIds.map(eventLabel).join(", ")}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell>
                    {m.pdfUrl ? (
                      <a href={m.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                        <ExternalLink className="h-3 w-3" />
                        {m.pdfFileName}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => openReview(m)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendingMemos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nothing pending.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Card>
            <CardHeader>
              <CardTitle>Decided</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Table aria-label="Decided absence memos">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cadet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decidedMemos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.cadetName}</TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell>{m.reviewedAt ? new Date(m.reviewedAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{m.reviewedBy ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{m.status === "Returned" ? m.returnReason : m.reviewNotes}</TableCell>
                    </TableRow>
                  ))}
                  {decidedMemos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nothing decided yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewingId(undefined)}>
        <DialogContent className="max-w-lg">
          {reviewing && (
            <>
              <DialogHeader>
                <DialogTitle>Review — {reviewing.cadetName}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="text-sm text-muted-foreground">
                  <div>
                    <strong>PMTs:</strong> {reviewing.pmtEventIds.map(eventLabel).join(", ")}
                  </div>
                  <div>
                    <strong>Reason:</strong> {reviewing.reason}
                    {reviewing.medicalDocSent && " (medical documentation sent separately)"}
                  </div>
                  {reviewing.pdfUrl && (
                    <a href={reviewing.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                      <ExternalLink className="h-3 w-3" />
                      View memo PDF
                    </a>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label>Your name</Label>
                  <Input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Who's reviewing this" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Notes</Label>
                  <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Optional" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Return reason (if returning)</Label>
                  <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="What the cadet needs to fix" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" disabled={deciding} onClick={() => decide(reviewing, "Returned")}>
                  Return
                </Button>
                <Button variant="destructive" disabled={deciding} onClick={() => decide(reviewing, "Rejected")}>
                  Reject
                </Button>
                <Button disabled={deciding} onClick={() => decide(reviewing, "Accepted")}>
                  Accept
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
