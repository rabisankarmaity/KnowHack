import { createFileRoute } from "@tanstack/react-router";
import { Notifications } from "@/pages/app/Notifications";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — KnowHack" }] }),
  component: Notifications,
});