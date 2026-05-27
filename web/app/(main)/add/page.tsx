import { scanPeopleIndex } from "@/lib/scan-people";
import { AddJobForm } from "./add-job-form";

export const dynamic = "force-dynamic";

export default function AddJobPage() {
  const people = scanPeopleIndex().map((p) => ({ slug: p.slug }));
  return <AddJobForm people={people} />;
}
