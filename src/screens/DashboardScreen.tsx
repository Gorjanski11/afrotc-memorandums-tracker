import { useMemo } from "react";
import { motion } from "motion/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LayoutDashboard, FileText, ClipboardList, TriangleAlert, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AbsenceMemo, DeviationMemo } from "../domain/types";

interface Props {
  absenceMemos: AbsenceMemo[];
  deviationMemos: DeviationMemo[];
}

function HeroStat({ icon, label, value, tone, index }: { icon: React.ReactNode; label: string; value: string; tone?: "critical"; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.05 }}>
      <Card className="hover:shadow-md">
        <CardContent className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone === "critical" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </span>
          <div>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className={cn("text-2xl font-semibold tabular-nums", tone === "critical" && "text-destructive")}>{value}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DashboardScreen({ absenceMemos, deviationMemos }: Props) {
  const pendingAbsence = useMemo(() => absenceMemos.filter((m) => m.status === "Pending"), [absenceMemos]);
  const awaitingSubmission = useMemo(() => deviationMemos.filter((m) => m.status === "Assigned"), [deviationMemos]);
  const overdueDeviations = useMemo(
    () => awaitingSubmission.filter((m) => m.dueDate && new Date(m.dueDate).getTime() < Date.now()),
    [awaitingSubmission]
  );
  const awaitingReview = useMemo(() => deviationMemos.filter((m) => m.status === "Submitted"), [deviationMemos]);

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        Dashboard
      </h2>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <HeroStat
          icon={<FileText className="h-4.5 w-4.5" />}
          label="Absence Memos pending"
          value={String(pendingAbsence.length)}
          tone={pendingAbsence.length > 0 ? "critical" : undefined}
          index={0}
        />
        <HeroStat
          icon={<Clock className="h-4.5 w-4.5" />}
          label="Deviations awaiting submission"
          value={String(awaitingSubmission.length)}
          index={1}
        />
        <HeroStat
          icon={<TriangleAlert className="h-4.5 w-4.5" />}
          label="Deviations overdue"
          value={String(overdueDeviations.length)}
          tone={overdueDeviations.length > 0 ? "critical" : undefined}
          index={2}
        />
        <HeroStat
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          label="Deviations awaiting review"
          value={String(awaitingReview.length)}
          tone={awaitingReview.length > 0 ? "critical" : undefined}
          index={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <FileText className="h-4 w-4 text-primary" />
              Pending Absence Memos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingAbsence.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing pending.</p>
            ) : (
              <div className="space-y-1.5">
                {pendingAbsence.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span>{m.cadetName}</span>
                    <span className="text-muted-foreground">{new Date(m.submittedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <TriangleAlert className="h-4 w-4 text-destructive" />
              Overdue Deviation Memos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueDeviations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing overdue.</p>
            ) : (
              <div className="space-y-1.5">
                {overdueDeviations.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span>{m.cadetName}</span>
                    <span className="text-muted-foreground">Due {new Date(m.dueDate!).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
