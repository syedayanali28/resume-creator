"use client";

type JobSearchBarProps = {
  inputId?: string;
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
};

export function JobSearchBar({
  inputId = "job-search",
  value,
  onChange,
  resultCount,
  totalCount,
}: JobSearchBarProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-slate-600" htmlFor={inputId}>
        Search jobs
      </label>
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='e.g. person:yanbo company:linkedin role:manager link:4404580379'
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400"
        autoComplete="off"
        spellCheck={false}
      />
      <p className="text-xs text-slate-500">
        {value.trim()
          ? `${resultCount} match${resultCount === 1 ? "" : "es"} (includes hidden jobs)`
          : `${resultCount} active job${resultCount === 1 ? "" : "s"} · ${totalCount} total in archive`}
        . Use{" "}
        <code className="rounded bg-slate-100 px-1">person:</code>,{" "}
        <code className="rounded bg-slate-100 px-1">company:</code>,{" "}
        <code className="rounded bg-slate-100 px-1">role:</code>, or{" "}
        <code className="rounded bg-slate-100 px-1">link:</code> to combine filters.
      </p>
    </div>
  );
}
