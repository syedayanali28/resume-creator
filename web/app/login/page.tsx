import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";
import {
  portalPasswordRequired,
  portalSessionCookieName,
  verifyPortalSession,
} from "@/lib/session";

export default async function LoginPage() {
  if (!portalPasswordRequired()) {
    redirect("/");
  }
  const token = (await cookies()).get(portalSessionCookieName())?.value;
  if (verifyPortalSession(token)) {
    redirect("/");
  }
  return <LoginForm />;
}
