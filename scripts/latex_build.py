"""Compile LaTeX to PDF via pdflatex (two passes for stable references)."""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


def pdflatex(tex_path: Path, *, passes: int = 2) -> None:
    tex_path = tex_path.resolve()
    out_dir = tex_path.parent
    if shutil.which("pdflatex") is None:
        raise FileNotFoundError("pdflatex not found on PATH. Install a TeX distribution (e.g. MiKTeX).")
    stem = tex_path.stem
    for _ in range(passes):
        subprocess.run(
            [
                "pdflatex",
                "-interaction=nonstopmode",
                "-halt-on-error",
                f"-output-directory={out_dir}",
                str(tex_path),
            ],
            cwd=out_dir,
            check=True,
        )
    # Clean auxiliary files (keep .tex and .pdf)
    for suffix in (".aux", ".out"):
        aux = out_dir / f"{stem}{suffix}"
        if aux.exists():
            aux.unlink()


def latex_escape_plain(s: str) -> str:
    """Escape plain text for use inside LaTeX \\texttt{} or similar."""
    mapping = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(mapping.get(c, c) for c in s)
