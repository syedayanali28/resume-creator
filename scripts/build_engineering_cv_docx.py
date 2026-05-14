"""
Build a one-page-style engineering CV in Word matching the reference PDF layout
(ALL CAPS header, | contact row, ruled section titles, Times New Roman, tabbed dates).

Content is taken verbatim from master-resume.tex (same facts and wording).
Outputs under people/<Person>/complete/: general-cv-engineering-style.docx (+ PDF via Word).
"""
from __future__ import annotations

import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from docx import Document

from layout_paths import complete_dir, ensure_layout

from cv_engineering_template import (
    add_bullets,
    add_contact_row,
    add_italic_subheading,
    add_name_block,
    add_project_title_line,
    add_section_title,
    add_skills_category_bullet,
    add_subheading_two_rows,
    apply_page,
    polish_doc_fonts,
)


def docx_to_pdf_word(docx_path: Path, pdf_path: Path) -> None:
    import win32com.client

    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(str(docx_path.resolve()), ReadOnly=True)
        try:
            doc.SaveAs(str(pdf_path.resolve()), FileFormat=17)
        finally:
            doc.Close(SaveChanges=False)
    finally:
        word.Quit()


def build_document() -> Document:
    doc = Document()
    apply_page(doc)

    add_name_block(doc, "ALI SYED AYAN")
    add_contact_row(
        doc,
        phone="+852 97537220",
        email="syedayanali28@gmail.com",
        email_url="mailto:syedayanali28@gmail.com",
        github_label="GitHub",
        github_url="https://github.com/syedayanali28",
        linkedin_label="LinkedIn",
        linkedin_url="https://www.linkedin.com/in/syedayanali/",
    )

    # ----- EDUCATION -----
    add_section_title(doc, "EDUCATION", space_before=2)
    add_subheading_two_rows(
        doc,
        "City University of Hong Kong",
        "Hong Kong",
        "B.Sc. Computer Science, Minor in Business Intelligence",
        "Jun 2022 - Jun 2026",
    )
    add_bullets(
        doc,
        [
            "Scholarships & awards: International Student Top Scholarship (HK$720,000 total); Dean's List; Tiger Talent Program (3×).",
            "Coursework: Web Application Development, Big Data Analytics, Machine Learning, Data Structures & Algorithms, Database Systems, Fundamentals of Data Science, Operating Systems, Computer Networks, Software Engineering, Discrete Mathematics, Computer Vision, Data Science.",
        ],
    )

    # ----- TECHNICAL KNOWLEDGE (Skills & Interests from master) -----
    add_section_title(doc, "TECHNICAL KNOWLEDGE")
    add_skills_category_bullet(
        doc,
        "Languages",
        "Python, Go, Rust, SQL, JavaScript, TypeScript, Java, C, C++, Bash, PowerShell, HTML, CSS, VBA, Cypher, Assembly, UNIX.",
    )
    add_skills_category_bullet(
        doc,
        "Libraries & frameworks",
        "Snowflake, React, Redis, Node.js, Next.js, Vue.js, FastAPI, Pydantic, Flask, Selenium, NumPy, Pandas, SciPy, scikit-learn, Spark, Seaborn, Matplotlib, PyTorch, OpenCV, TensorFlow, ONNX Runtime, Ollama, Hugging Face, Transformers, jQuery, Tailwind CSS, Express.",
    )
    add_skills_category_bullet(
        doc,
        "Data & AI",
        "Neo4j, RAG, LLMs, MLOps, LLMOps, GenAI, TF-IDF, PCA, clustering, classification, anomaly detection, topic modelling, Tableau, Power BI.",
    )
    add_skills_category_bullet(
        doc,
        "Cloud & DevOps",
        "AWS (S3, Lambda, Redshift, QuickSight), GCP, Azure, Vercel, Docker, Kubernetes, Grafana, CI/CD, Ansible, Linux.",
    )
    add_skills_category_bullet(
        doc,
        "Tools",
        "Git, GitHub, Jira, Confluence, Postman, PostgreSQL, MySQL, MongoDB, ServiceNow, Microsoft 365, Chinese word processing, MCP servers.",
    )
    add_skills_category_bullet(
        doc,
        "Practices",
        "Agile/Scrum, REST APIs, system design, software architecture, technical writing, L3 support, UI/UX, SEO (WordPress).",
    )
    add_skills_category_bullet(
        doc,
        "Languages (spoken)",
        "English (fluent); Cantonese and Mandarin (working proficiency); Urdu and Hindi.",
    )

    # ----- EXPERIENCE -----
    add_section_title(doc, "EXPERIENCE")

    add_subheading_two_rows(
        doc,
        "Hong Kong Monetary Authority",
        "Hong Kong",
        "Analyst Programmer (IT Division – Business Enablement & Software Architecture)",
        "Jul 2025 - Present",
    )
    add_italic_subheading(doc, "AI / ML, data platforms, and automation")
    add_bullets(
        doc,
        [
            "Engineered an open-source chatbot for BRDR using retrieval-augmented generation (RAG) over a knowledge base of ~10,000 PDFs; Python for ingestion and processing, pgvector for embeddings, SQL-backed vector search, and Grafana for observability.",
            "Built an agentic firewall review automation tool using LLMOps practices (JIRA API, Next.js, Open Policy Agent) to encode review guidelines as policy-as-code and LLM-friendly workflows, reducing security review effort by ~30 hours/month.",
        ],
    )
    add_italic_subheading(doc, "Product delivery, operations, and stakeholder collaboration")
    add_bullets(
        doc,
        [
            "Spearheaded an AI Outlook Email Assistant within a Scrum team across the full SDLC; served as L3 support for production troubleshooting and incident resolution.",
            "Worked with the Product Owner and engineers to translate requirements into technical workflows; delivered training, prompts, and documentation; produced Tableau and Power BI dashboards for reporting.",
        ],
    )

    add_subheading_two_rows(
        doc,
        "Jay Cee Ess Global",
        "Remote (Australia-based)",
        "Software Engineer",
        "Aug 2025 - Present",
        space_before=10,
    )
    add_italic_subheading(doc, "Growth, conversion, and product")
    add_bullets(
        doc,
        [
            "Participated in performance tracking that supported ~AUD 100,000/month revenue; helped revamp a legacy site into a high-performance web app, run Google Ads, improve UX (~200% user intake), and lift conversion rates.",
        ],
    )
    add_italic_subheading(doc, "Payments and e-commerce")
    add_bullets(
        doc,
        [
            "Reduced cart abandonment ~70% by integrating Stripe with Apple Pay, Google Pay, and Alipay for multi-method checkout.",
        ],
    )
    add_italic_subheading(doc, "Algorithms and performance engineering")
    add_bullets(
        doc,
        [
            "Cut price retrieval latency ~99% with a custom in-memory routing engine based on Yen's K-shortest paths algorithm.",
        ],
    )
    add_italic_subheading(doc, "Data layer and infrastructure")
    add_bullets(
        doc,
        [
            "Reduced database costs ~75% by replacing a rigid Supabase setup with Vercel Upstash Redis for fast lookups and complex multi-carrier routing, unlocking new logistics market segments.",
        ],
    )

    add_subheading_two_rows(
        doc,
        "Universal Innotech Group Company Limited",
        "Tsuen Wan, Hong Kong",
        "Junior Software Engineer",
        "Sep 2024 - May 2025",
        space_before=10,
    )
    add_italic_subheading(doc, "General administration, content, and documentation")
    add_bullets(
        doc,
        [
            "Applied data mining to extract and analyse Chinese insurance data from 200+ PDFs, saving 200+ hours.",
            "Improved IIQE exam answer prediction via prompt engineering (accuracy 40% → 92%).",
            "Delivered a food product showcase site with Next.js, Tailwind CSS, and React; sales increased over 100%.",
            "Authored interactive PowerPoint materials for online design courses; course enrolment up 80%.",
            "Produced AML web-application documentation following team standards and consistent formatting.",
        ],
    )
    add_italic_subheading(doc, "Software engineering and cloud")
    add_bullets(
        doc,
        [
            "Optimised a broker management web app with reusable React components, Cache-Control headers, and server-side rendering; load times improved over 50%.",
            "Refactored a B2B SaaS platform with RESTful APIs and Neo4j integration for relationship visualisation; ~30% faster client decision-making.",
            "Deployed Python database update jobs on AWS (S3, Lambda) using Cypher to refresh Neo4j on a schedule.",
        ],
    )
    add_italic_subheading(doc, "Web development")
    add_bullets(
        doc,
        [
            "Built AML checking and PEP automation in JavaScript, React, and Python; reduced Open Sanction API spend by HK$10,000+/month.",
            "Extended broker portal with reusable components (e.g. Support Ticket history, Admin Dashboard), SSR, and caching; load time reduced over 50%.",
        ],
    )
    add_italic_subheading(doc, "Data analysis and AI evaluation")
    add_bullets(
        doc,
        [
            "Reviewed AI literature (e.g. Qwen, BERT, LLaMA, Gemma) and summarised findings in Tableau.",
            "Applied TF-IDF, PCA, k-means, SVM, anomaly detection, and topic modelling to insurance data; saved 500+ hours of manual work.",
            "Used LLMs to extract structured data from 40+ Chinese KYC/CDD documents; improved turnaround by 3+ days.",
            "Performed ad-hoc analyses in Python and SQL to answer business questions.",
        ],
    )
    add_italic_subheading(doc, "Representative platform outcomes (cross-cutting)")
    add_bullets(
        doc,
        [
            "Graph API layer on Neo4j for B2B BFSI KYC automation; Python scraping for sanctions and PEP updates.",
            "Python ETL pipelines for recurring reports (50,000+ records/cycle); report prep time −40%, turnaround from 2 days to 2 hours.",
            "Evaluation frameworks for 10+ AI tools/agents on financial data (accuracy, consistency, latency, reliability).",
        ],
    )

    add_subheading_two_rows(
        doc,
        "Yi Shing Group Ltd. (YSG)",
        "Science Park, Hong Kong",
        "Machine Learning Intern",
        "Jun 2024 - Aug 2024",
        space_before=10,
    )
    add_bullets(
        doc,
        [
            "Real-time fire and smoke detection with YOLOv8 (~90% accuracy); ~95% after optimisation and migration toward Google Cloud Vertex AI.",
            "Full-stack Flask application connected to Vertex AI; CI/CD for deployments.",
            "Webcam-based live inference; Huawei Cloud ModelArts/OBS pipeline for experiments and storage.",
            "Collaborated with electrical engineering on camera integration and field tests; defined endpoints for load and performance testing.",
        ],
    )

    add_subheading_two_rows(
        doc,
        "Yi Shing Group Ltd. (YSG)",
        "Science Park, Hong Kong",
        "Machine Learning Intern",
        "Jun 2023 - Aug 2023",
        space_before=10,
    )
    add_bullets(
        doc,
        [
            "Computer vision models with PyTorch and YOLO on Google Colab; datasets from Roboflow and Kaggle.",
            "Preprocessing, resizing, normalisation; bounding-box annotation; accuracy improved from 50% to 70%.",
            "Raspberry Pi prototype linking detections to a fire curtain; Streamlit app for annotated outputs.",
        ],
    )

    add_subheading_two_rows(
        doc,
        "City University of Hong Kong",
        "Kowloon Tong, Hong Kong",
        "Student Helper and Mentor",
        "Feb 2023 - Mar 2024",
        space_before=10,
    )
    add_bullets(
        doc,
        [
            "Exploratory analysis on 20+ ESG reports (trends, risks, opportunities).",
            "Built hkmrs.org with WordPress and CSS; SEO and UI/UX focus.",
            "Delivered a TensorFlow model development workshop for 30+ students and faculty (TED CityU).",
            "Supported ad-hoc tasks for the Talent and Education Department.",
        ],
    )

    add_subheading_two_rows(
        doc,
        "Fori Inc.",
        "Islamabad, Pakistan",
        "Technology Resource",
        "May 2021 - Jun 2021",
        space_before=10,
    )
    add_bullets(
        doc,
        [
            "Prototyped real-time traffic pattern analysis with Selenium and BeautifulSoup (Google Maps screenshots) and a HTML/CSS/JavaScript dashboard.",
        ],
    )

    # ----- ACADEMIC PROJECTS -----
    add_section_title(doc, "ACADEMIC PROJECTS")

    add_project_title_line(doc, "Blockchain Web3 E-Wallet (JavaScript, TypeScript, Next.js)", "Feb 2025 - Mar 2025")
    add_bullets(doc, ["Web3 app for wallet creation, connecting existing wallets, and secure transfers."])

    add_project_title_line(doc, "AI Image Classification (Python, PyTorch)", "Oct 2024 - Nov 2024")
    add_bullets(doc, ["ResNet18 and Vision Transformer; 98% intra-class and 94% inter-class accuracy."])

    add_project_title_line(doc, "Movie Search and Recommender (Python, JavaScript, jQuery, Flask)", "Jun 2024 - Jul 2024")
    add_bullets(
        doc,
        [
            "Flask and Pandas pipelines for preprocessing; REST APIs with genre/cast/year filters and pagination.",
        ],
    )

    add_project_title_line(doc, "Facial Sentiment Classification (Python, TensorFlow, Keras, OpenCV)", "Feb 2024 - Mar 2024")
    add_bullets(doc, ["CNN for happy vs. sad; normalisation and augmentation."])

    add_project_title_line(doc, "Nutrition Tracker App (Java, CLI, BlueJ, Visual Paradigm)", "Feb 2024 - Mar 2024")
    add_bullets(
        doc,
        [
            "UML (class and use-case diagrams); Factory, Builder, State, Observer; SOLID-oriented CLI application.",
        ],
    )

    add_project_title_line(doc, "Base kernel project (C, Assembly)", "Feb 2024 - Mar 2024")
    add_bullets(
        doc,
        [
            "Priority scheduling and named pipes in a teaching OS kernel; ~30% improvement on benchmark tasks and reliable IPC.",
        ],
    )

    # ----- AWARDS -----
    add_section_title(doc, "AWARDS, LEADERSHIP & CERTIFICATIONS")
    add_bullets(
        doc,
        [
            "International Student Top Scholarship (HK$720,000 total), City University of Hong Kong (Jun 2022 - Jun 2026).",
            "President — Pakistan Students' Association, CityU (Dec 2023 - May 2024).",
            "Managing Director — Student Committee, Jockey Club Humanity Hall (Hall 1) SRO, CityU (Aug 2023 - Aug 2024).",
            "CompTIA Security+; Google Cybersecurity Professional Certificate (in progress, Jan 2025 - present).",
        ],
    )

    polish_doc_fonts(doc)
    return doc


def main() -> int:
    person = "Ali-Syed-Ayan"
    ensure_layout(person)
    out_dir = complete_dir(person)
    out_docx = out_dir / "general-cv-engineering-style.docx"
    out_pdf = out_dir / "general-cv-engineering-style.pdf"
    doc = build_document()
    doc.save(out_docx)
    print(f"Wrote {out_docx}")
    try:
        docx_to_pdf_word(out_docx, out_pdf)
        print(f"Wrote {out_pdf}")
    except Exception as e:
        print(f"PDF export skipped ({e}). Open the DOCX in Word and Save As PDF if needed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
