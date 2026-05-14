"""Filesystem layout: people/<Person>/complete/ and people/<Person>/<Company>/<Role>/"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Plain-text job posting URL in each tailored packet folder (exact filename).
JOB_LINK_FILENAME = "job link.txt"


def person_root(person_slug: str) -> Path:
    return REPO_ROOT / "people" / person_slug


def complete_dir(person_slug: str) -> Path:
    return person_root(person_slug) / "complete"


def job_packet_dir(person_slug: str, company_slug: str, role_slug: str) -> Path:
    """``people/<Person>/<Company>/<Role>/`` — one tailored application packet."""
    return person_root(person_slug) / company_slug / role_slug


def tailored_packet_basename(person_slug: str, application_dir: Path) -> str:
    """``<Person>_<Company>_<Role>`` from the role folder path (deepest segment = role)."""
    company_slug = application_dir.parent.name
    role_slug = application_dir.name
    return f"{person_slug}_{company_slug}_{role_slug}"


def tailored_resume_tex(person_slug: str, application_dir: Path) -> Path:
    """``<Person>_<Company>_<Role>_resume.tex`` inside the role folder."""
    b = tailored_packet_basename(person_slug, application_dir)
    return application_dir / f"{b}_resume.tex"


def tailored_cover_letter_tex(person_slug: str, application_dir: Path) -> Path:
    """``<Person>_<Company>_<Role>_cover-letter.tex``."""
    b = tailored_packet_basename(person_slug, application_dir)
    return application_dir / f"{b}_cover-letter.tex"


def tailored_job_link_txt(application_dir: Path) -> Path:
    """``job link.txt`` — one-line (or few lines) job posting URL(s) for this packet."""
    return application_dir / JOB_LINK_FILENAME


def ensure_layout(
    person_slug: str,
    company_slug: str | None = None,
    role_slug: str | None = None,
) -> None:
    complete_dir(person_slug).mkdir(parents=True, exist_ok=True)
    if company_slug and role_slug:
        job_packet_dir(person_slug, company_slug, role_slug).mkdir(parents=True, exist_ok=True)
