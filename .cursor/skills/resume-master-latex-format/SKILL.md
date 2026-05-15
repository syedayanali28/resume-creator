---
name: resume-master-latex-format
description: >-
  Canonical LaTeX preamble and macros for every person's ``people/<Person>/complete/master-resume.tex``:
  document class, geometry, hyperref (blue links), parskip, list spacing, ``\ressection``, ``\resumeSubheading``,
  ``\projectlink``, ``\resumeHeading``. Use when creating a new person folder, editing any master CV, or aligning
  preamble drift across people/Rajan-Fauz, people/Zhao-Yanbo, people/Ali-Syed-Ayan.
---

# Master resume LaTeX format (repo-wide)

## Scope

Applies to **`people/<PersonSlug>/complete/master-resume.tex`** for **all** people in this repo. **Do not** treat this as person-specific: copy the block below verbatim into each new master file’s preamble (after person-specific `%` header comments only).

**Not in scope:** Ali’s **tailored** one-pagers still follow **`people/Ali-Syed-Ayan/complete/template-resume.tex`** per `ali-syed-ayan-resume-builder` and `resume-tailored-job-packages.mdc`.

## Compile

From repo root:

```bash
python scripts/compile_complete_master.py --person <PersonSlug>
```

## Canonical preamble (must match across masters)

Place immediately before `\begin{document}`. Person-specific **comments** (name, compile line) may appear above `\documentclass`.

- **`article` + `10pt`:** Standard `article` only honours **10pt**, **11pt**, **12pt**. Using **`9pt`** without `extarticle` is ignored and triggers an “Unused global option” warning; keep **`10pt`** unless you deliberately switch to `extarticle`.
- **`geometry`:** `margin=4mm` on all sides (dense master CV).
- **`hyperref`:** `colorlinks=true`, blue `urlcolor` / `linkcolor` / `citecolor` so links are visible in the PDF.
- **Section rule:** `\ressection` uses a **0.1pt** horizontal rule and the vertical `\vspace{-\parskip}` pattern below (do not swap for a thicker rule on masters without a repo-wide decision).

```latex
\documentclass[10pt,a4paper]{article}

\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=4mm]{geometry}
\usepackage{enumitem}
\usepackage[colorlinks=true,urlcolor=blue,linkcolor=blue,citecolor=blue]{hyperref}
\usepackage{parskip}
\setlength{\parskip}{0.18em}

\setlist[itemize]{leftmargin=1.15em, topsep=0pt, itemsep=0.05em, parsep=0pt, partopsep=0pt}

\newcommand{\ressection}[1]{%
  \vspace{0.8em}%
  \noindent{\large\scshape\bfseries #1}\par\nobreak
  \vspace{-\parskip}%
  \vspace{-\parskip}%
  \vspace{-\parskip}%
  \vspace{-\parskip}%
  \noindent\rule{\linewidth}{0.1pt}\par\nobreak
  \vspace{-\parskip}%
}

\newcommand{\resumeSubheading}[4]{%
  \vspace{0.6em}%
  \begin{tabular*}{\textwidth}{l@{\extracolsep{\fill}}r}
    \textbf{#1} & \textbf{#2} \\
    \textit{\small #3} & \textit{\small #4} \\
  \end{tabular*}\vspace{0.32em}}

\newcommand{\projectlink}[2]{\href{#1}{\textbf{#2}}}

\newcommand{\resumeHeading}[2]{%
  \vspace{0.6em}%
  \noindent\textbf{\small #1}\hfill\textit{\small #2}\par\vspace{0.28em}}
```

### Macros

| Macro | Purpose |
|--------|--------|
| `\ressection{Title}` | Section heading (small caps bold + thin rule). |
| `\resumeSubheading{Org}{Place}{Title}{Dates}` | Four-column experience / education row. |
| `\projectlink{URL}{visible title}` | GitHub (or other) project line: bold linked title. |
| `\resumeHeading{left}{right}` | Project or subsection line with optional date on the right. |

## When editing

- If you change **any** of the above for one person’s master, **update this skill** and **sync the other** `complete/master-resume.tex` files so all masters stay aligned.
- **Body content** (name, bullets, employers) stays person-specific; only this preamble + macro block is shared.
