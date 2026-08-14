import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/app/Dashboard";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KnowHack" }] }),
  component: Dashboard,
});