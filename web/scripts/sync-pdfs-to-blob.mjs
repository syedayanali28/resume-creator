import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const ROOT = path.resolve(process.cwd(), "..", "people");
const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.error("Missing BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

function isHidden(name) {
  return name.startsWith(".");
}

async function listDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function existsFile(filePath) {
  try {
    const st = await fs.stat(filePath);
    return st.isFile();
  } catch {
    return false;
  }
}

async function uploadIfExists(person, company, role, kind) {
  const stem = `${person}_${company}_${role}`;
  const filename = kind === "resume" ? `${stem}_resume.pdf` : `${stem}_cover-letter.pdf`;
  const abs = path.join(ROOT, person, company, role, filename);
  if (!(await existsFile(abs))) return false;

  const data = await fs.readFile(abs);
  const pathname = `people/${person}/${company}/${role}/${filename}`;
  await put(pathname, data, {
    token,
    access: "public",
    addRandomSuffix: false,
    contentType: "application/pdf",
    allowOverwrite: true,
  });
  return true;
}

async function main() {
  const people = (await listDirs(ROOT)).filter((n) => n !== "node_modules" && !isHidden(n));
  let uploaded = 0;
  let checked = 0;

  for (const person of people) {
    const personDir = path.join(ROOT, person);
    const companies = (await listDirs(personDir)).filter(
      (n) => n !== "complete" && !isHidden(n),
    );

    for (const company of companies) {
      const companyDir = path.join(personDir, company);
      const roles = (await listDirs(companyDir)).filter((n) => !isHidden(n));
      for (const role of roles) {
        checked += 1;
        const upResume = await uploadIfExists(person, company, role, "resume");
        const upCover = await uploadIfExists(person, company, role, "cover-letter");
        if (upResume) uploaded += 1;
        if (upCover) uploaded += 1;
      }
    }
  }

  console.log(`Checked ${checked} role folders, uploaded ${uploaded} PDFs to Blob.`);
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
