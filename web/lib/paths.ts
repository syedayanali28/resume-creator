import path from "path";

/** Absolute path to `people/` (LaTeX sources and PDFs live under each role folder). */
export function getPeopleRoot(): string {
  const fromEnv = process.env.PEOPLE_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "..", "people");
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export function assertSafePathSegment(value: string, label: string): void {
  if (!SAFE_SEGMENT.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
}
