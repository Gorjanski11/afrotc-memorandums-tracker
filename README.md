# Borinkeneers Memorandums Tracker

Absence Memo and Deviation Memo workflow for the detachment. A standalone site -- same Firebase
project/database as [afrotc-training-tracker](https://github.com/Gorjanski11/afrotc-training-tracker)
(the "TO's" site) and [afrotc-accountability-tracker](https://github.com/Gorjanski11/afrotc-accountability-tracker),
but a separate deployment, separate repo, no login on any of the three.

## Why one Firebase project, three sites

This site reads the same `cadets` roster and `pmtEvents` calendar the other two sites use, and
writes a side-effect status update into the Accountability site's shared `attendance` collection
when an Absence Memo is decided (Accepted flips a covered PMT's Attendance record from `PE`
"Pending Excuse" to `AE` "Approved Excuse"; Rejected flips it to `A` "Absent"). It never touches
the TO's-site `completions` collection -- per the user's explicit rule, an excuse never reverts an
absence-driven Training Objective grade, so that integration is intentionally one-directional and
lives entirely on the Accountability side, not here.

It owns its own `absenceMemos` and `deviationMemos` collections, plus real PDF storage via
Firebase Storage (Blaze plan) -- no AI summarization of memo content, by explicit request.

No authentication, by design -- same tradeoff as the other two sites: anyone with the link can
view, submit, and review everything.

## Status

**Built so far:**
- **Absence Memos** -- submission (cadet picks themself, every PMT the absence covers in one
  memo, reason, medical-doc-sent flag, PDF upload) and a review queue (Accept / Reject / Return,
  with the PE -> AE/A attendance side-effect applied on Accept/Reject).
- **Deviation Memos** -- assignment (reason, assigned-by, due date), cadet submission (PDF
  upload), and review (Accept / Return -- no Rejected state, a deviation always resolves to one of
  those two).
- **History** -- searchable by cadet name, shows every memo of both types for that cadet.
- **Dashboard** -- pending/awaiting/overdue counts across both memo types.

**Not yet built:**
- Email notifications (Resend + a Cloud Function) for absence-memo submission confirmations,
  24-hours-before-deadline reminders on Deviation Memos, and flag digests.
- No fixed catalog of Deviation reasons was given -- currently free text. Revisit if a standard
  list turns out to be wanted.

## Local development

```sh
npm install
npm run dev
```

Talks to production Firestore and Storage directly unless `VITE_USE_FIREBASE_EMULATOR=true` is
set (see `src/lib/firebase.ts`) -- be careful with writes and uploads during local testing, same
as the other two sites.

## One-time Firebase console setup

Firestore rules are already shared (same project as the other two sites, blanket
`allow read, write: if true` -- see the TO's site's `firestore.rules`). Storage rules are **not**
shared automatically -- paste `storage.rules` from this repo into **Firebase console -> Storage ->
Rules** once, so memo PDF uploads aren't rejected by Storage's default-deny rules.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to
`main`. Requires the repo's Settings -> Pages -> Source set to "GitHub Actions", and
`vite.config.ts`'s `base` kept in sync with the repo name if it's ever renamed.
