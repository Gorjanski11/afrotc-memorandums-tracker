// Mirrors the relevant subset of afrotc-training-tracker's and afrotc-accountability-tracker's
// constants -- separate repos, same Firebase project, so these are duplicated rather than imported
// across repos.

export const AS_LEVELS = ["AS100", "AS200", "AS250", "AS300", "AS400", "AS500", "AS600"] as const;
export type AsLevel = (typeof AS_LEVELS)[number];

export const ROSTER_CLASSES = ["Cadre", "POC", "GMC"] as const;
export type RosterClass = (typeof ROSTER_CLASSES)[number];

// Mirrors the Accountability site's GROUPS -- same shared `cadets` collection, same field. Used
// here only for the TRG/CWL staff-access rule (see domain/access.ts).
export const GROUPS = ["CWL", "TRG", "OG", "MSG", "WSG"] as const;
export type Group = (typeof GROUPS)[number];

const GMC_AS_LEVELS: readonly AsLevel[] = ["AS100", "AS200", "AS250", "AS500"];

export function deriveClass(asLevel: AsLevel | undefined, isCadre: boolean): RosterClass {
  if (isCadre) return "Cadre";
  if (asLevel && GMC_AS_LEVELS.includes(asLevel)) return "GMC";
  return "POC";
}

// Shared `pmtEvents` collection -- a memo covers one or more of these.
export const PMT_EVENT_TYPES = ["PT", "LLAB", "FM", "D&C"] as const;
export type PmtEventType = (typeof PMT_EVENT_TYPES)[number];

// Same reason list as the Accountability site's Post-Accountability "A" reason dropdown, so a memo's
// stated reason lines up with what a reviewer would see on the attendance record it's excusing.
export const ABSENCE_REASONS = ["Academics", "Medical", "Personal", "Work/Job", "Other"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

// AS Class options for an academic-class absence (as opposed to a PMT absence) -- deliberately a
// narrower list than the full roster AS_LEVELS above (no AS250/AS500/AS600 -- those don't have
// their own AS-class instruction block).
export const ABSENCE_AS_CLASSES = ["AS100", "AS200", "AS300", "AS400"] as const;
export type AbsenceAsClass = (typeof ABSENCE_AS_CLASSES)[number];

export const INSTRUCTORS = ["Lt Col Laboy", "Capt Jackson", "Capt Deaton", "TSgt Reynoso"] as const;
export type Instructor = (typeof INSTRUCTORS)[number];

/**
 * Absence Memo lifecycle. "Assigned" -- auto-created by the Accountability site the instant a
 * cadet is marked Absent, before the cadet has done anything. "Pending" -- the cadet has submitted
 * (folding in the Assigned record(s) they picked plus any AS-Class absence they added), which also
 * flips the covered Attendance record(s) from A to PE. Accepted -> flips PE to AE. Rejected -> final,
 * flips PE back to A, no resubmit expected. Returned -> sent back to the cadet to fix and resubmit
 * within 48 hours, no Attendance side-effect (stays PE).
 */
export const ABSENCE_MEMO_STATUSES = ["Assigned", "Pending", "Accepted", "Rejected", "Returned"] as const;
export type AbsenceMemoStatus = (typeof ABSENCE_MEMO_STATUSES)[number];

// PMT type -> local clock time the session ends, used for the 72-hour Absence Memo submission
// deadline (Section: Connection with attendance).
export const PMT_END_TIME: Record<PmtEventType, { hours: number; minutes: number }> = {
  PT: { hours: 6, minutes: 30 },
  LLAB: { hours: 11, minutes: 45 },
  FM: { hours: 11, minutes: 45 },
  "D&C": { hours: 11, minutes: 45 },
};

/** A cadet has 72 hours from the PMT's own end time (not the time it was marked Absent) to submit an Absence Memo covering it. */
export function absenceMemoDeadline(eventDate: string, eventType: PmtEventType): Date {
  const end = new Date(eventDate);
  const { hours, minutes } = PMT_END_TIME[eventType];
  end.setHours(hours, minutes, 0, 0);
  return new Date(end.getTime() + 72 * 3_600_000);
}

/** Deviation Memo lifecycle -- assign, cadet submits, reviewer accepts or returns. No Rejected state (a deviation memo is always eventually resolved, not denied outright). */
export const DEVIATION_MEMO_STATUSES = ["Assigned", "Submitted", "Accepted", "Returned"] as const;
export type DeviationMemoStatus = (typeof DEVIATION_MEMO_STATUSES)[number];

export const MEMO_STATUS_LABELS: Record<string, string> = {
  Pending: "Pending",
  Accepted: "Accepted",
  Rejected: "Rejected",
  Returned: "Returned",
  Assigned: "Assigned",
  Submitted: "Submitted",
};
