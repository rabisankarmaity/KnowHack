import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/app/Settings";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — KnowHack" }] }),
  component: SettingsPage,
});