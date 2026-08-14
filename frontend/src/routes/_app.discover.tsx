import { createFileRoute } from "@tanstack/react-router";
import { Discover } from "@/pages/app/Discover";

export const Route = createFileRoute("/_app/discover")({
  head: () => ({ meta: [{ title: "Discover — KnowHack" }] }),
  component: Discover,
});