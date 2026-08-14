import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetails } from "@/pages/app/ProjectDetails";

export const Route = createFileRoute("/_app/projects/$id")({
  head: () => ({ meta: [{ title: "Project — KnowHack" }] }),
  component: ProjectDetails,
});