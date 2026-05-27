/** Local only when explicitly set. Otherwise cloud agent + GitHub repo. */
export function useLocalTailorRuntime(): boolean {
  return process.env.CURSOR_TAILOR_RUNTIME?.trim().toLowerCase() === "local";
}
