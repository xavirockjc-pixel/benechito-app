"use server";

import { redirect } from "next/navigation";
import { borrarCookieSesion } from "@/lib/auth";

export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}
