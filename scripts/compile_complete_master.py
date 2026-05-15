"""
Compile people/<Person>/complete/master-resume.tex → master-resume.pdf (general-purpose CV).

Shared LaTeX preamble for all masters: .cursor/skills/resume-master-latex-format/SKILL.md

Usage:
  python compile_complete_master.py --person Ali-Syed-Ayan
  python compile_complete_master.py --person Zhao-Yanbo
  python compile_complete_master.py --person Rajan-Fauz
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from layout_paths import complete_dir, ensure_layout
from latex_build import pdflatex


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--person", default="Ali-Syed-Ayan")
    args = parser.parse_args()

    ensure_layout(args.person)
    tex = complete_dir(args.person) / "master-resume.tex"
    if not tex.is_file():
        print(f"Missing master resume: {tex}", file=sys.stderr)
        return 1
    try:
        pdflatex(tex)
    except subprocess.CalledProcessError as e:
        print(e.stderr or e.stdout or str(e), file=sys.stderr)
        return 1
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        return 1
    pdf = tex.with_suffix(".pdf")
    print(f"Wrote {pdf}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
