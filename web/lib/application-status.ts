export const APPLICATION_STATUSES = [
  "watching",
  "ready_to_apply",
  "applied",
  "oa",
  "interview",
  "final",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "closed",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const DEFAULT_STATUS: ApplicationStatus = "ready_to_apply";

const LABELS: Record<ApplicationStatus, string> = {
  watching: "Watching",
  ready_to_apply: "Ready to apply",
  applied: "Applied",
  oa: "Online assessment",
  interview: "Interview",
  final: "Final round",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed: "Closed / filled",
};

export function statusLabel(s: ApplicationStatus): string {
  return LABELS[s] ?? s;
}

export function parseApplicationStatus(raw: unknown): ApplicationStatus {
  if (typeof raw !== "string") return DEFAULT_STATUS;
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((APPLICATION_STATUSES as readonly string[]).includes(v)) {
    return v as ApplicationStatus;
  }
  return DEFAULT_STATUS;
}

export function statusBadgeClass(s: ApplicationStatus): string {
  switch (s) {
    case "offer":
    case "accepted":
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/15";
    case "interview":
    case "final":
      return "bg-sky-50 text-sky-800 ring-sky-600/15";
    case "applied":
    case "oa":
      return "bg-violet-50 text-violet-800 ring-violet-600/15";
    case "rejected":
    case "withdrawn":
    case "closed":
      return "bg-zinc-100 text-zinc-700 ring-zinc-600/12";
    case "watching":
    case "ready_to_apply":
    default:
      return "bg-amber-50 text-amber-900 ring-amber-600/15";
  }
}
