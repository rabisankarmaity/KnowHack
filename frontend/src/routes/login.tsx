import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/pages/auth/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — KnowHack" }] }),
  component: LoginPage,
});