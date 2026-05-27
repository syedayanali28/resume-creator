import { cloudTargetBranch } from "@/lib/cursor-cloud-agent";

export type TailorPromptInput = {
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string;
};

/**
 * Instructions for a Cursor cloud (or local) agent to tailor LaTeX resume and
 * cover letter under `people/<Person>/<Company>/<Role>/`.
 */
export function buildTailorPrompt(input: TailorPromptInput): string {
  const { personSlug, companySlug, roleSlug, jobPostingUrl } = input;
  const targetBranch = cloudTargetBranch();

  return `You are in the resume_creator repository at the workspace root.

Goal: produce an up-to-date tailored resume PDF and cover letter PDF for one job application packet, following this repository's rules and skills.

Target packet:
- Person folder slug: ${personSlug}
- Company folder slug: ${companySlug}
- Role folder slug: ${roleSlug}
- Job posting URL (canonical application link): ${jobPostingUrl}

Candidate profile and skillset: use only materials already in this repo for that person under \`people/${personSlug}/complete/\` (for example \`master-resume.tex\`, \`resume-knowledge-base.yaml\` when present, and for Ali Syed Ayan also \`template-resume.tex\` as the one-pager layout source). Follow loaded Cursor project rules and skills (e.g. resume-tailored-job-packages, person-specific skills). Do not use an external LinkedIn profile URL or any source outside the repository for candidate facts; do not invent employers, dates, titles, or metrics.

Authoritative project rules (read and follow):
- .cursor/rules/resume-tailored-job-packages.mdc
- For person Ali-Syed-Ayan also follow .cursor/skills/ali-syed-ayan-resume-builder/SKILL.md and use people/Ali-Syed-Ayan/complete/template-resume.tex as the LaTeX layout basis for tailored one-pagers; facts from complete/master-resume.tex and complete/resume-knowledge-base.yaml only.
- For other people, preamble alignment per .cursor/skills/resume-master-latex-format/SKILL.md and people/${personSlug}/complete/master-resume.tex.

Concrete steps:
1. Ensure the role directory exists: people/${personSlug}/${companySlug}/${roleSlug}/
2. Create or overwrite the file named exactly \`job link.txt\` (with a space) in that folder. Line 1 must be the job posting URL above, trimmed, with no extra lines before it unless you intentionally add comments after line 1.
3. From repo root, scaffold and compile using Python when available:
   python scripts/generate_job_package.py --person ${personSlug} --company ${companySlug} --role ${roleSlug} --job-url "${jobPostingUrl}"
   If the script is missing or the environment lacks Python/LaTeX, install dependencies or use the repo's documented pdflatex flow in scripts/latex_build.py as appropriate.
4. Retrieve readable job description text from the posting URL when the environment allows (browser tools, curl, or MCP). Extract keywords and map them to bullets and skills already present in the person's master sources. Do not fabricate employers, degrees, dates, or metrics.
5. Edit the tailored files:
   people/${personSlug}/${companySlug}/${roleSlug}/${personSlug}_${companySlug}_${roleSlug}_resume.tex
   people/${personSlug}/${companySlug}/${roleSlug}/${personSlug}_${companySlug}_${roleSlug}_cover-letter.tex
   until pdflatex succeeds and both PDFs exist beside the .tex files. Fix LaTeX errors iteratively.
6. Hard pagination policy (user override, must be enforced):
   - The resume must end at exactly one visual PDF page.
   - After each meaningful edit pass, compile and visually confirm the rendered PDF is one page (do not rely only on assumptions).
   - Do not change LaTeX layout/preamble spacing/margins/macros to force one page.
   - If it is more than one page:
     a) Remove one bullet from every Work Experience role except the first two roles. The first two roles must be kept at exactly 4 bullets each.
     b) Recompile and re-check visually.
   - If it is still more than one page:
     c) Remove the oldest job entirely.
     d) Recompile and re-check visually.
   - If it is still more than one page:
     e) Rewrite Extracurricular Activities bullets to be concise, each bullet no more than 15 words.
     f) Recompile and re-check visually.
   - Preserve factual accuracy: do not invent employers, dates, titles, or metrics.
7. Git: commit all changes with a clear message and push directly to the \`${targetBranch}\` branch. Do not open a pull request.
8. End with a short summary: files touched, whether both PDFs built, git push status, and any blockers (e.g. posting behind login).

Use model behaviour consistent with composer-2: precise edits, minimal unrelated churn.`;
}
