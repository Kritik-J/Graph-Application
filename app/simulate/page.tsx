import { redirect } from "next/navigation";

/** The explorer absorbed the standalone simulator; keep the old path working. */
export default function SimulateRedirect() {
  redirect("/");
}
