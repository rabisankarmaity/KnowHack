import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "@/pages/app/Profile";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — KnowHack" }] }),
  component: Profile,
});