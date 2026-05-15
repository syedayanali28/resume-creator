import { CursorTailorForm } from "./cursor-tailor-form";
import { scanPeopleIndex } from "@/lib/scan-people";

export default function CursorTailorPage() {
  const people = scanPeopleIndex();

  return <CursorTailorForm people={people} />;
}
