---
name: ali-syed-ayan-resume-builder
description: >-
  Build one-page tailored LaTeX resumes for Ali Syed Ayan under ``people/Ali-Syed-Ayan/<Company>/<Role>/``.
  Tailored LaTeX/PDF names use ``<PersonSlug>_<CompanySlug>_<RoleSlug>_resume.*`` and ``_cover-letter.*`` (see scripts/layout_paths.py).
  Copy preamble and layout from people/Ali-Syed-Ayan/complete/template-resume.tex (not
  master-resume); facts from master-resume.tex and resume-knowledge-base.yaml. For each job
  posting URL, retrieve JD text, extract ~30 keywords, and map bullets/projects/skills from the
  master before trimming. Fill page 1 when whitespace remains; two-line bullets must use both
  lines or collapse to one. STAR bullets; punctuation without em dash or tilde for “about”.
  Use when editing ``<PersonSlug>_<CompanySlug>_<RoleSlug>_resume.tex``, tailoring to a job description, or compiling job packages.
---

# Ali Syed Ayan: tailored resume builder

## When this applies

Use whenever you create or edit:

- `people/Ali-Syed-Ayan/<CompanySlug>/<RoleSlug>/<PersonSlug>_<CompanySlug>_<RoleSlug>_resume.tex` (with `<PersonSlug>` = `Ali-Syed-Ayan`)
- `people/Ali-Syed-Ayan/<CompanySlug>/<RoleSlug>/<PersonSlug>_<CompanySlug>_<RoleSlug>_cover-letter.tex` (when present)
- `people/Ali-Syed-Ayan/<CompanySlug>/<RoleSlug>/job link.txt` (posting URL, line 1)

**Overrides (when in conflict):** For these paths, follow this skill **instead of** the generic workspace rule `resume-tailored-job-packages.mdc` wherever that rule’s section titles, master-layout mirroring, or fixed heading set conflict with this file’s template.

## Canonical template (layout and sections)

**Primary LaTeX source (copy this preamble and structure for every new tailored resume):** `people/Ali-Syed-Ayan/complete/template-resume.tex` — compile to `template-resume.pdf` in the same folder to verify layout. The tailored file’s **preamble must match** the template byte-for-byte for `\documentclass`, packages, `geometry`, `\parskip`, `\ressection`, `\resumeSubheading`, `\resumeHeading`, `\setlist[itemize]{...}`, and the header `center` block unless the user requests a documented global change.

**Visual and rhythm reference (section order, contact line, link behavior):** `people/Ali-Syed-Ayan/complete/Syed Ayan Ali Resume 2026.pdf`, or `g:\My Drive\Syed Ayan Ali Resume 2026.pdf` when that path exists.

Older tailored files (for example under `Qube-Research-and-Technologies/<Role>/`) may drift; **prefer re-syncing** their preamble and macros from `complete/template-resume.tex` when you touch them.

## Job posting workflow (mandatory when the user gives a link or JD)

When the user supplies a **posting URL** or **full job description** for a new or updated tailored packet:

1. **Retrieve posting text:** Use the live page, MCP browser, or the user’s paste. Capture the **full** responsibilities and requirements when possible (LinkedIn often hides text behind “Show more”; expand it or ask the user to paste if needed). **Persist the posting URL** in **`job link.txt`** in the **role** folder (exact filename: `job link.txt`): **line 1** = the canonical job posting URL (plain text). Prefer a short stable URL over a long tracking URL when both exist. Keep this file updated when the link changes; you may set it with `python scripts/generate_job_package.py --person Ali-Syed-Ayan --company <CompanySlug> --role <RoleSlug> --job-url "<URL>"` (see `scripts/layout_paths.tailored_job_link_txt`).
2. **Extract about 30 keywords or short phrases:** Include tools (e.g. Node.js, SQL), lifecycle terms (coding, testing, rollout, maintenance), domains (application development, APIs), and soft terms (collaboration, production support). List them in a **`%` comment block** at the top of `<PersonSlug>_<CompanySlug>_<RoleSlug>_resume.tex` (and mirror the role in `<PersonSlug>_<CompanySlug>_<RoleSlug>_cover-letter.tex` opening) so future edits stay traceable.
3. **Map to the master (in order):**
   - **Work Experience:** For each employer block in `complete/master-resume.tex`, pick **every** `\item` (across the master’s internal category sub-lists) whose tools, outcomes, or verbs **match** a keyword or clear synonym. **Flatten** into a **single** `itemize` per employer in the tailored file (no `\noindent\textit{...}` category headers).
   - **Projects:** Include projects from the master whose **title or stack** matches posting keywords (e.g. Flask + REST for backend roles; Next.js for web roles). Omit projects only when they do not match the role or when pagination forces cuts.
   - **Skills and Interests:** Use **exactly six** `\item` lines under `\ressection{Skills and Interests}`—**one line per category**, with these `\textbf{Label:}` prefixes only: **Programming Languages**; **Libraries \& Frameworks**; **Software and Tools**; **Skills**; **Languages**; **Interests** (same order as `template-resume.tex`). For the first five lines, **cap at 50 words** after the label (count space-separated tokens in the body); keep each category on a **single** `\item`. **Interests** should stay a short comma-separated list (hobbies only; no invented claims). Reorder skill tokens so posting keywords appear **early**; do not invent tools not supported by the master or YAML.
4. **Facts:** All metrics, employers, titles, dates, and URLs must remain traceable to `complete/master-resume.tex` or `complete/resume-knowledge-base.yaml`. **Never** invent links; use `\href` only where the master or YAML documents a URL.

## Hyperlinks

- **Header and cover letter:** Always `\href{mailto:...}{...}` for email and `\href{https://...}{...}` for **GitHub** and **LinkedIn** using the exact URLs in `resume-knowledge-base.yaml` / master; keep the contact line structurally aligned with the 2026 PDF (pipe- or bar-separated fields in LaTeX with `\textbar` or spacing as in **`template-resume.tex`**). Tailored resumes should load **`hyperref`** with **`colorlinks=true`** and **`urlcolor=blue`** (and matching **`linkcolor`**) so every link is visibly blue in the PDF unless the user requests otherwise. In **tailored cover letter body text**, do **not** `\href` the job posting or cite LinkedIn job IDs. Posting URLs stay in **`job link.txt`** and top **`%` comments** only.
- **Bullets (chatbots, apps, sites):** When the master, YAML, or 2026 PDF documents a **real URL** for a deliverable (e.g. RAG chatbot deployment, internal tool, public site such as `hkmrs.org`), add `\href{URL}{label}` in that bullet so the PDF matches the template’s “linked portfolio” behavior. **Never** invent URLs; omit the link if none is recorded.

## Tailored cover letter (`*_cover-letter.tex`)

- **Posting URL:** Keep the live posting in **`job link.txt`** and in the top **`%` comments** only. In the letter body, name **company** and **role** in plain text. **Never** link or cite a LinkedIn **job ID** or job view URL in the prose.
- **Length:** **≤250 words** from `Dear Hiring Manager,` through the printed name below the sign-off, counting readable words not LaTeX markup.
- **Opening:** The first paragraph after the salutation must state what you are applying for and put the **role title in `\textbf{...}`** once, with company and location in text.
- **Structure:** One short second paragraph on fit, then **exactly three** `\item` lines in `itemize`. Each item uses a **short bold label**, a **colon**, then one sentence tied to the JD with **quantified** facts when the master supports them. State clearly that you have thrived in **high risk, delivery focused** environments and can bring that mindset to the employer.
- **Sign-off:** **Warm Regards,** then **Syed Ayan Ali** on the next line, unless the user requests otherwise.
- **Voice:** Conversational but authoritative; contractions allowed; varied sentence lengths; simple active verbs. **Do not** use “unlock the potential,” “delve,” “tapestry,” “in summary,” “let’s explore,” “fostering,” or “game changer.”
- **Punctuation:** No em dash as ornament, no decorative hyphen chains, no stacked parentheses, no backslash lists, and no **extra** colons beyond the three bullet labels.

### Structure you must follow (2026 template, not master)

1. **Header:** Match `template-resume.tex`: centered name line, then one compact contact line (**phone**, **clickable email**, **GitHub**, **LinkedIn**) using `\href` with the exact URLs from `people/Ali-Syed-Ayan/complete/resume-knowledge-base.yaml` / `complete/master-resume.tex`, structurally aligned with **`Syed Ayan Ali Resume 2026.pdf`**.
2. **Education:** One `\resumeSubheading{City University of Hong Kong}{Hong Kong}{Bachelor of Science in Computer Science, Minor in Business Intelligence}{Jun 2022 -- Jun 2026}` (or equivalent wording matching the master), then **exactly two** `itemize` bullets: `\item \textbf{Scholarships \& Awards:} ...` and `\item \textbf{Coursework:} ...`, each kept to a **single PDF line** (trim lists if a bullet wraps to two lines).
3. **Work Experience:** Chronological `\resumeSubheading{Company}{Location}{Title}{Period}` blocks. Under each role use a **single** `itemize` list.
   - **Do not** copy the master’s layout: no `\noindent\textit{...}` category sub-headings and no multiple stacked lists per employer.
4. **Projects:** Only projects that strengthen the target role or match extracted keywords. Each entry: bold title, then stack or dates separated by **commas** or a **colon** when needed; reserve **parentheses** only if they remove real ambiguity. Add `\href{URL}{label}` when the master, YAML, or 2026 PDF gives a real project or demo URL. Use `\resumeHeading` as defined in `template-resume.tex`. At least **one** bullet per listed project.
5. **Skills and Interests:** **Exactly six** `\item` lines: `\textbf{Programming Languages:}`, `\textbf{Libraries \& Frameworks:}`, `\textbf{Software and Tools:}`, `\textbf{Skills:}`, `\textbf{Languages:}`, `\textbf{Interests:}`. **At most 50 words** in the body of each of the first five lines (after the label); one `\item` per category. Reorder comma-separated tokens for ATS and readers so posting keywords appear prominently.

**Explicit non-goal:** Do **not** expand a tailored `<PersonSlug>_<CompanySlug>_<RoleSlug>_resume.tex` into the multi-page narrative layout of `people/Ali-Syed-Ayan/complete/master-resume.tex` (e.g. internal category breakdowns or the full Awards block on the same page). You may still **import more bullets per role** from the master into a **flattened** list when the posting demands coverage and length allows.

## Source of truth for facts (subset by role)

Pull and **select** content from:

- `people/Ali-Syed-Ayan/complete/master-resume.tex`: phrasing, numbers, stack names, scope.
- `people/Ali-Syed-Ayan/complete/resume-knowledge-base.yaml`: structured bullets by `id` / `categories` for picking role-relevant points.

Rules:

- Employers, titles, locations, degree, and date ranges must match the master/YAML **unless** the user explicitly authorizes a correction.
- Tailoring for a job ad happens **inside bullets** (keywords, emphasis), **without** inventing employers, metrics, degrees, or tools you cannot support from those sources.
- You may **omit** entire roles, projects, or award lines when they do not help the role or when pagination requires it; **only** with user confirmation if the omission removes a still-current job or misrepresents timeline continuity.

## Punctuation and typography (resume and cover letter body)

- **Parentheses:** Use **sparingly**; only when they remove real ambiguity (for example a precise legal job title). Do **not** stack optional asides, examples, or tool lists in repeated parentheses; prefer **commas**, **colons**, or **semicolons**, or split into two `\item` lines if the ideas are unrelated.
- **Dashes:** Do **not** use an **em dash** (`---` in LaTeX or a Unicode em dash in source) as sentence punctuation. Prefer a **comma**, **colon**, **semicolon**, or a new sentence within the same bullet. Use **hyphens** only where grammar or compounds require them, or inside **date ranges** in `\resumeSubheading` (LaTeX `Jun 2022 -- Jun 2026` is fine). For **which team or division** within a role title, use **hyphens** or **commas** as in the 2026 PDF, not decorative dash pairs.
- **Tilde / “approximately”:** Do **not** use `~` in prose or `$\sim$` in math for “approximately”; write **about** or **approximately** before the number or percentage.
- **Bullets:** Each `\item` is one achievement line: lead with a **strong verb**; use **colons** to introduce short lists of tools or channels; use **semicolons** to join two closely related clauses; add other punctuation only for clarity.

## STAR bullets (achievement style)

Each experience or project bullet should read as a **condensed STAR** line, not a duty list:

- Fold **Situation** and **Task** into a short phrase, often after the opening verb or in a trailing clause.
- **Action:** what **you** did, with tools, ownership, and partners when space allows.
- **Result:** a **quantified** or time-bound outcome when the master or YAML supports it: hours saved, percent change, latency, volume, cost, accuracy.

**Length:** At most **two wrapped lines** in the PDF per bullet. Prefer **action verb**, then **context or task**, then **measurable result** in one breath. For tone, rhythm, and how metrics sit at the end of a clause, mirror **`people/Ali-Syed-Ayan/complete/Syed Ayan Ali Resume 2026.pdf`** (or the Drive copy when available), while keeping facts tied to `complete/master-resume.tex` and `resume-knowledge-base.yaml`.

## Layout, length, and bullets

### Default priority: posting match, then one full page

- **First:** Maximize **keyword and JD alignment** using bullets, projects, and skill tokens drawn from the master (see **Job posting workflow** above), **within** the **Creaxon line budget** (**One-page line budget** below): tune wording and keyword order **inside** those line counts before adding net new `\item` rows.
- **Second:** After `pdflatex`, if the PDF is **more than one page**, paginate using the steps below. During those passes you may reduce to **at most 3** bullets for each of the **two** most recent roles and **at least 2** for other retained roles **only as part of trimming**, prioritizing removal or merge of **least posting-relevant** lines first.
- **Third:** If the PDF is **one page** but has a **large empty band** at the bottom, treat that as unfinished layout: add vetted, posting-relevant content from the master (see **One page (ceiling and floor)** below) until the page looks **professionally filled**.

### One page (ceiling and floor)

- **Ceiling:** The tailored PDF should be **exactly one page** when feasible (no accidental spill to two).
- **Floor / density:** A **short** one-pager with a **large empty band** at the bottom looks unfinished. After `pdflatex`, if there is **clear leftover vertical space** on page 1, **add** posting-relevant material from the master until the layout reads **full**: extra `\item` lines (flattened from `master-resume.tex`), an additional **Project** block, a richer **Education** or **Skills** line, or restoring a trimmed role **only** when facts and posting alignment support it. Still **no** invented facts; still **no** tightening `geometry` or list spacing below `template-resume.tex` just to pad.
- **Do not** tighten `geometry`, `\parskip`, or list spacing below **`people/Ali-Syed-Ayan/complete/template-resume.tex`** just to cheat pagination.
- If one page is impossible while respecting true facts, **stop** and ask the user: omit a non-relevant older role, accept two pages, or a **documented** one-off spacing change.

### One-page line budget (canonical reference)

Treat **`people/Ali-Syed-Ayan/Creaxon-Technologies/Software-Engineer-HK/Ali-Syed-Ayan_Creaxon-Technologies_Software-Engineer-HK_resume.tex`** as the **canonical one-page vertical budget** for Ali’s tailored one-pagers (same preamble as `complete/template-resume.tex`). After every edit, `pdflatex` must yield **exactly one page** with **similar fill** to that PDF—not a half-empty page and not a spill to page 2.

**Default inventory to match** (unless the user explicitly approves a different layout): **Education** — **2** `\item`; **Work Experience** — **11** achievement `\item` lines across **four** employers in this pattern: **3** (HKMA) + **4** (Jay Cee Ess) + **3** (Universal) + **1** (YSG); **Projects** — **2** `\resumeHeading` blocks with **1** `\item` each; **Skills and Interests** — **6** `\item` lines (see structure point 5). If you add material (extra employer, longer bullets, more projects), **remove or shorten** an equal vertical amount elsewhere in the **same edit pass** so the footprint stays at or below this reference.

### Pagination fixes when the PDF is longer than one page

1. **First pass (one-liners):** Rewrite **2-3** bullets (spread across sections; often older roles, Education, or Projects) as **true one-liners**. Prefer turning **multi-line** bullets into one-liners before touching already-tight lines.
2. **Second pass (swap weakest for shorter):** If still over one page, replace the **least posting-relevant** verbose bullets with **one-liners** that keep the strongest verifiable fact or keyword. Repeat toward more relevant bullets as needed.
3. **Third pass (role bullet caps):** If still over one page, enforce **at most 3** bullets per **HKMA** and **Jay Cee Ess Global** and **at least 2** per other retained employer by **merging** related lines or **dropping** the weakest `\item` per block, never breaking facts.
4. **Fourth pass:** Remove or shorten **Projects**, then **Education** extras, then **shorten wording inside** the six **Skills** lines (keep all six `\item` labels if possible), in that general order, until one page—while steering back toward the **Creaxon line budget** above.

### Bullet shape (one-line vs two-line)

- Aim for **at most two wrapped lines per bullet** in the PDF.
- **If you use two lines, complete both lines:** a bullet that wraps to two lines but leaves the second line **mostly empty** wastes vertical space (you pay for two lines of height without delivering two lines of value). **Either** load line two with real substance from the master (extra metric, scope, tool, stakeholder, or outcome) so both lines read **dense**, **or** rewrite the whole `\item` as a **single** tight **one-liner** so you only consume one line.
- **Two-line balance:** If you keep two lines, rewrite so the **second line is not a short orphan**; merge clauses, reorder phrases, or trim duplication until both lines carry similar density.

### After edits

Compile with:

`python scripts/generate_job_package.py --person Ali-Syed-Ayan --company <CompanySlug> --role <RoleSlug>`

If the PDF exceeds one page, follow **Pagination fixes when the PDF is longer than one page** above (still no geometry cheats), recompile, and repeat until one page.

## Preamble

- Copy `\documentclass`, packages, `geometry`, `\setlength{\parskip}`, `\ressection`, `\resumeSubheading`, `\resumeHeading`, `\setlist[itemize]{...}`, **`hyperref`** (with **`colorlinks=true`**, **`urlcolor=blue`**, **`linkcolor=blue`**), and the header `center` block from **`people/Ali-Syed-Ayan/complete/template-resume.tex`** into each tailored `<PersonSlug>_<CompanySlug>_<RoleSlug>_resume.tex` **unless** the user asks for a documented global styling change.
- **Do not** import the master resume’s extra macros, multi-page layout, or internal category breakdowns unless the user explicitly needs them outside the one-page template.

## Quick checklist before hand-off

- [ ] Header uses `\href` for **email**, **GitHub**, and **LinkedIn**; cover letter matches.
- [ ] Any **URL** from master/YAML/2026 PDF for a chatbot, site, or demo appears as `\href` in the right bullet; no invented links.
- [ ] Preamble and section order match **`complete/template-resume.tex`** (not the master layout).
- [ ] **Skills and Interests:** exactly **six** `\item` lines (**Programming Languages**; **Libraries \& Frameworks**; **Software and Tools**; **Skills**; **Languages**; **Interests**); first five **≤50 words** each after `\textbf{Label:}`.
- [ ] **One-page budget:** Inventory matches the **Creaxon** reference (`Creaxon-Technologies/Software-Engineer-HK/Ali-Syed-Ayan_Creaxon-Technologies_Software-Engineer-HK_resume.tex`): Education **2**; Work **11** bullets in the **3+4+3+1** pattern; Projects **2×1**; Skills **6** lines; PDF is **one page** with similar fill.
- [ ] No master-style category sub-blocks under jobs.
- [ ] **Posting:** Top-of-file `%` comment lists **~30 keywords**; bullets, projects, and skills reflect those terms where the master supports them.
- [ ] **`job link.txt`** in the packet folder: line **1** = canonical job posting URL (plain text; user’s posting link, prefer stable URL without tracking noise when both exist).
- [ ] If **one page without trims:** posting keywords land **inside** the **Creaxon inventory** (Education **2**, Work **11** in **3+4+3+1**, Projects **2×1**, Skills **6**); expand coverage by richer phrasing, not extra rows, unless the user approves a new budget.
- [ ] If **over one page:** pagination passes applied; **3 / ≥2** caps used only as part of trimming, after keyword-rich content is attempted.
- [ ] **Page fill:** PDF is **one page** and does **not** end with a large empty block; if it did, more master-backed content was added until balanced.
- [ ] **Two-line rule:** Any two-line `\item` **fills** both lines with substance, **or** the bullet was collapsed to **one** one-liner (no half-used second line).
- [ ] Punctuation: no em dash; **light** parentheses; no `~` / `$\sim$` for “about”; colons and semicolons carry structure inside bullets.
- [ ] Bullets read as **condensed STAR** with a lead verb and a **quantified** result when supported by sources.
- [ ] `pdflatex` → **one page** (or user-approved exception documented in a `%` comment).
