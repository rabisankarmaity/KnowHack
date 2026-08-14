import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UploadWizard } from "@/pages/app/UploadWizard";

export const Route = createFileRoute("/_app/upload")({
  validateSearch: z.object({
    edit: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Upload project — KnowHack" }] }),
  component: UploadWizard,
});