import { motion } from "motion/react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, LayoutDashboard, ClipboardList, Search, Mail, LogOut, KeyRound } from "lucide-react";
import { useRoster } from "./hooks/useRoster";
import { usePmtEvents } from "./hooks/usePmtEvents";
import { useAbsenceMemos } from "./hooks/useAbsenceMemos";
import { useDeviationMemos } from "./hooks/useDeviationMemos";
import { useAttendanceLink } from "./hooks/useAttendanceLink";
import { useAttendanceRecords } from "./hooks/useAttendanceRecords";
import { useEmailTemplates } from "./hooks/useEmailTemplates";
import { useAuth } from "./hooks/useAuth";
import { isAuthorizedStaff } from "./domain/access";
import { SignInScreen } from "./components/SignInScreen";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { DashboardScreen } from "./screens/DashboardScreen";
import { AbsenceMemosScreen } from "./screens/AbsenceMemosScreen";
import { DeviationMemosScreen } from "./screens/DeviationMemosScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { AutomaticMemorandumsScreen } from "./screens/AutomaticMemorandumsScreen";

type Screen = "dashboard" | "absence" | "deviation" | "history" | "automatic";

function AnimatedPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

// Cadre-only login (Email/Password, accounts provisioned individually -- no public sign-up). Same
// Firebase project/database as the TO's and Accountability sites: reads the shared `cadets` roster
// and `pmtEvents` calendar, writes side-effect status flips into Accountability's `attendance`
// collection when an Absence Memo is decided, and owns its own absenceMemos/deviationMemos
// collections plus real PDF storage (Firebase Storage, Blaze plan).
function App() {
  const { user, authLoading, signIn, signOut, changePassword } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const rosterState = useRoster();
  const eventsState = usePmtEvents();
  const absenceState = useAbsenceMemos();
  const deviationState = useDeviationMemos();
  const attendanceLink = useAttendanceLink();
  const attendanceRecordsState = useAttendanceRecords();
  const emailTemplatesState = useEmailTemplates();

  const [screen, setScreen] = useState<Screen>("dashboard");

  const dataLoading =
    rosterState.loading ||
    eventsState.loading ||
    absenceState.loading ||
    deviationState.loading ||
    attendanceLink.loading ||
    attendanceRecordsState.loading ||
    emailTemplatesState.loading;
  const loadError =
    rosterState.error ||
    eventsState.error ||
    absenceState.error ||
    deviationState.error ||
    attendanceLink.error ||
    attendanceRecordsState.error ||
    emailTemplatesState.error;

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (!user) {
    return <SignInScreen signIn={signIn} />;
  }

  if (!dataLoading && !loadError && !isAuthorizedStaff(user.email, rosterState.roster)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-destructive">
          Your account ({user.email}) isn't authorized for the Memorandums Tracker. Contact TRG if you believe this is a mistake.
        </p>
        <Button variant="secondary" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-input bg-background px-8 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </span>
          <div className="flex items-baseline gap-4">
            <h1 className="text-xl font-semibold">Borinkeneers Memorandums Tracker</h1>
            <span className="text-sm text-muted-foreground">Absence & Deviation memos</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="icon" onClick={() => setChangePasswordOpen(true)} aria-label="Change password">
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} changePassword={changePassword} />

      <Tabs value={screen} onValueChange={(v) => setScreen(v as Screen)} className="flex flex-1 flex-col overflow-hidden">
        <nav className="px-8">
          <TabsList>
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="absence">
              <FileText className="h-3.5 w-3.5" />
              Absence Memos
            </TabsTrigger>
            <TabsTrigger value="deviation">
              <ClipboardList className="h-3.5 w-3.5" />
              Deviation Memos
            </TabsTrigger>
            <TabsTrigger value="history">
              <Search className="h-3.5 w-3.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="automatic">
              <Mail className="h-3.5 w-3.5" />
              Automatic Memorandums
            </TabsTrigger>
          </TabsList>
        </nav>

        <main className="flex-1 overflow-auto p-6">
          {dataLoading ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : loadError ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-destructive">{loadError}</span>
            </div>
          ) : (
            <>
              <TabsContent value="dashboard">
                <AnimatedPanel>
                  <DashboardScreen
                    roster={rosterState.roster}
                    events={eventsState.events}
                    attendance={attendanceRecordsState.records}
                    absenceMemos={absenceState.memos}
                    deviationMemos={deviationState.memos}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="absence">
                <AnimatedPanel>
                  <AbsenceMemosScreen
                    events={eventsState.events}
                    memos={absenceState.memos}
                    updateMemo={absenceState.updateMemo}
                    applyMemoDecision={attendanceLink.applyMemoDecision}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="deviation">
                <AnimatedPanel>
                  <DeviationMemosScreen
                    roster={rosterState.roster}
                    memos={deviationState.memos}
                    createMemo={deviationState.createMemo}
                    updateMemo={deviationState.updateMemo}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="history">
                <AnimatedPanel>
                  <HistoryScreen
                    roster={rosterState.roster}
                    events={eventsState.events}
                    absenceMemos={absenceState.memos}
                    deviationMemos={deviationState.memos}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="automatic">
                <AnimatedPanel>
                  <AutomaticMemorandumsScreen templates={emailTemplatesState.templates} saveTemplate={emailTemplatesState.saveTemplate} />
                </AnimatedPanel>
              </TabsContent>
            </>
          )}
        </main>
      </Tabs>
    </div>
  );
}

export default App;
