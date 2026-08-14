import { createFileRoute } from "@tanstack/react-router";
import { SignupPage } from "@/pages/auth/SignupPage";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — KnowHack" }] }),
  component: SignupPage,
});