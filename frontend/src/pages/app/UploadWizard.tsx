import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  PartyPopper,
  Loader2,
  Plus,
  Trash2,
  Save,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { projectsApi } from "@/lib/api/projects";
import { apiErrorMessage, apiFieldErrors, FIELD_MESSAGES } from "@/lib/api/client";
import type { AiReviewDTO, FileRef, ProjectDTO } from "@/lib/api/types";
import { toast } from "sonner";
import {
  steps,
  FIELD,
  FormState,
  initialForm,
  toPayload,
  fromProject,
  validateStep,
  previewReview,
  FieldHints,
  emptyTeamMember,
  emptyExistingSolution,
  emptyFeature,
  emptyJourney,
  emptyFeedback,
  emptyFutureScope,
  RESEARCH_METHODS,
  fmtBytes,
  lineHelpers,
  csvHelpers,
} from "@/pages/app/upload-model";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|js|jar|msi|dll|apk|com|scr|vbs|ps1|php|py|rb)$/i;
const MAX_MB = 25;

function validateFiles(files: File[]): string | null {
  for (const f of files) {
    if (!ALLOWED_MIME.has(f.type) || BLOCKED_EXT.test(f.name)) {
      return `"${f.name}" is not allowed. Use images (PNG/JPG/WebP/GIF), PDF, Word, PPT, ZIP, or MP4/WebM up to ${MAX_MB}MB.`;
    }
    if (f.size > MAX_MB * 1024 * 1024) return `"${f.name}" is larger than ${MAX_MB}MB.`;
  }
  return null;
}

const VISIBILITY_OPTIONS: { key: FormState["visibility"]; title: string; desc: string }[] = [
  { key: "public", title: "Public", desc: "Everyone can view and bookmark your Case File." },
  { key: "documentation-only", title: "Documentation only", desc: "Documentation visible, source code hidden." },
  { key: "learning-only", title: "Learning only", desc: "Architecture and lessons visible, implementation hidden." },
  { key: "campus-only", title: "Campus only", desc: "Verified university members only." },
  { key: "team-only", title: "Team only", desc: "Only contributors can view it." },
  { key: "private", title: "Private", desc: "Draft / private. Only you can view it." },
  { key: "scheduled", title: "Scheduled release", desc: "Becomes public after a selected date." },
];

const LICENSES: { key: FormState["license"]; title: string }[] = [
  { key: "all-rights-reserved", title: "All Rights Reserved" },
  { key: "mit", title: "MIT" },
  { key: "apache-2.0", title: "Apache 2.0" },
  { key: "creative-commons", title: "Creative Commons" },
  { key: "learning-only", title: "Learning Only License" },
];

export function UploadWizard() {
  const search = useSearch({ from: "/_app/upload" }) as { edit?: string };
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [, setSlug] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(Boolean(search.edit));
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dirty, setDirty] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [hints, setHints] = useState<FieldHints>({});
  const [review, setReview] = useState<AiReviewDTO | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const formRef = useRef(form);
  formRef.current = form;
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  // ---- Edit mode: load an existing project into the wizard ----
  useEffect(() => {
    if (!search.edit) return;
    let cancelled = false;
    setLoadingProject(true);
    projectsApi
      .getBySlug(search.edit)
      .then((res) => {
        if (cancelled) return;
        if (String((res.data.project.owner as ProjectDTO["owner"])?._id || "").length === 0) return;
        const p = res.data.project;
        setForm(fromProject(p));
        setProjectId(p._id);
        setSlug(p.slug);
        document.title = `Edit ${p.title} — KnowHack`;
      })
      .catch(() => toast.error(apiErrorMessage(undefined as never, "Could not load project for editing")))
      .finally(() => !cancelled && setLoadingProject(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.edit]);

  // ---- warn before leaving with unsaved changes ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ---- draft autosave (debounced) ----
  const serializedRef = useRef("");
  const dirtyRef = useRef(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      serializedRef.current = JSON.stringify(next);
      dirtyRef.current = true;
      setDirty(true);
      scheduleAutosave();
      return next;
    });
  };
  const patch = (fn: (prev: FormState) => FormState) => {
    setForm((prev) => {
      const next = fn(prev);
      serializedRef.current = JSON.stringify(next);
      dirtyRef.current = true;
      setDirty(true);
      scheduleAutosave();
      return next;
    });
  };

  const createOrUpdate = async (payload: Partial<ProjectDTO>) => {
    if (projectIdRef.current) {
      const res = await projectsApi.update(projectIdRef.current, payload);
      return res.data.project;
    }
    const res = await projectsApi.create({ ...payload, status: "draft" as const });
    setProjectId(res.data.project._id);
    setSlug(res.data.project.slug);
    return res.data.project;
  };

  const saveDraftNow = async (silent = false) => {
    if (savingRef.current) return;
    const payload = toPayload(formRef.current);
    if (!payload.title?.trim()) return;
    savingRef.current = true;
    setSaving("saving");
    try {
      await createOrUpdate(payload);
      setSaving("saved");
      dirtyRef.current = false;
      setDirty(false);
      if (!silent) toast.success("Draft saved");
    } catch (err) {
      setSaving("error");
      if (!silent) toast.error(apiErrorMessage(err, "Failed to save draft"));
    } finally {
      savingRef.current = false;
    }
  };

  const scheduleAutosave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!projectIdRef.current) {
      // Draft is created only after the basics step validates.
      return;
    }
    saveTimer.current = setTimeout(() => saveDraftNow(true), 1400);
  };

  const clearHint = (field: string) =>
    setHints((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const showHints = (errs: FieldHints) => {
    setHints(errs);
    const keys = Object.keys(errs);
    if (keys.length) {
      const msg = keys
        .map((k) => `• ${errs[k] || FIELD_MESSAGES[k] || "Please fix this field"}`)
        .join("\n");
      toast.error(msg, { duration: 6000 });
      return false;
    }
    return true;
  };

  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const goNext = () => {
    if (!showHints(validateStep(step, form))) {
      if (step === 0) setStep(0);
      return;
    }
    // Create the draft when leaving the basics step so autosave can kick in.
    if (!projectIdRef.current && form.title.trim()) {
      setSubmitting(true);
      void createOrUpdate(toPayload(form))
        .then(() => {
          setSaving("saved");
          dirtyRef.current = false;
          setDirty(false);
          setStep(Math.min(steps.length - 1, step + 1));
        })
        .catch((err) => toast.error(apiErrorMessage(err, "Could not create draft")))
        .finally(() => setSubmitting(false));
      return;
    }
    setStep(Math.min(steps.length - 1, step + 1));
  };

  const goBack = () => {
    saveDraftNow(true).catch(() => {});
    setStep(Math.max(0, step - 1));
  };

  // ---- file uploads (immediate, categorized) ----
  const uploadFiles = async (files: File[]): Promise<FileRef[]> => {
    const filesErrs = validateFiles(files);
    if (filesErrs) {
      toast.error(filesErrs);
      return [];
    }
    try {
      const res = await projectsApi.uploadFiles(files);
      return res.data.files;
    } catch (err) {
      toast.error(apiErrorMessage(err, "Upload failed"));
      return [];
    }
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>, onRefs: (refs: FileRef[]) => void) => {
    const fs = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!fs.length) return;
    const refs = await uploadFiles(fs);
    if (refs.length) onRefs(refs);
  };

  const runAiReview = async () => {
    if (!projectIdRef.current) {
      // Ensure a project exists first.
      if (!formRef.current.title.trim()) {
        toast.error("Add a project name first");
        setStep(0);
        return;
      }
      await createOrUpdate(toPayload(formRef.current));
      dirtyRef.current = false;
    } else {
      await saveDraftNow(true);
    }
    setReviewLoading(true);
    try {
      const res = await projectsApi.aiReview(projectIdRef.current!);
      setReview(res.data.review);
      toast.success(`Case File ${res.data.review.completeness}% complete`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "AI review unavailable"));
    } finally {
      setReviewLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim()) {
      toast.error("Project name is required");
      setStep(0);
      return;
    }
    if (!acknowledged) {
      toast.error("Please confirm you own the content before publishing");
      return;
    }
    setSubmitting(true);
    setHints({});
    try {
      const payload = toPayload(form);
      const project = await createOrUpdate(payload);
      const projectId = project._id;
      const published = await projectsApi.publish(projectId);
      const s = published.data.project.slug;
      setPublishedSlug(s);
      toast.success("Project published");
    } catch (err) {
      const fieldErrors = apiFieldErrors(err);
      if (fieldErrors.length) {
        const errs: FieldHints = {};
        for (const fe of fieldErrors) errs[fe.field] = fe.message;
        showHints(errs);
        setStep(0);
        return;
      }
      toast.error(apiErrorMessage(err, "Failed to publish"));
    } finally {
      setSubmitting(false);
    }
  };

  const preview = previewReview(form);

  const teamTotal = form.team.reduce((s, m) => s + (Number(m.contribution) || 0), 0);
  const hasTeam = form.team.some((m) => m.name.trim());

  if (loadingProject) {
    return (
      <div className="mx-auto grid max-w-6xl min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {search.edit ? "Edit project" : "Upload a project"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Step {step + 1} of {steps.length} · {steps[step].title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </span>
          )}
          {saving === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Draft saved
            </span>
          )}
          {saving === "error" && (
            <span className="flex items-center gap-1.5 text-xs text-red-500">
              <ShieldAlert className="h-3.5 w-3.5" /> Save failed
            </span>
          )}
          {dirty && saving !== "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Save className="h-3.5 w-3.5" /> Unsaved changes
            </span>
          )}
        </div>
      </div>

      <Progress value={progress} className="mb-8 h-1.5" />

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <DesktopSteps step={step} onStep={setStep} hoverDisabled={!projectIdRef.current} />
        </aside>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:p-8">
          {/* Mobile compact stepper */}
          <div className="mb-5 overflow-x-auto pb-2 lg:hidden">
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStep(i)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                    i === step
                      ? "gradient-bg text-white"
                      : i < step
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}. {s.title}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-semibold tracking-tight">{steps[step].title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{steps[step].desc}</p>

              <div className="mt-6 space-y-5">
                {step === 0 && (
                  <StepBasics form={form} onChange={patch} clearHint={clearHint} hints={hints} teamTotal={teamTotal} hasTeam={hasTeam} />
                )}
                {step === 1 && <StepProblem form={form} onChange={patch} />}
                {step === 2 && <StepResearch form={form} onChange={patch} pickFile={pickFile} />}
                {step === 3 && <StepExisting form={form} onChange={patch} set={set} />}
                {step === 4 && <StepSolution form={form} onChange={patch} set={set} />}
                {step === 5 && <StepArchitecture form={form} onChange={patch} set={set} pickFile={pickFile} />}
                {step === 6 && <StepFiles form={form} onChange={patch} set={set} pickFile={pickFile} />}
                {step === 7 && <StepJourney form={form} onChange={patch} set={set} />}
                {step === 8 && (
                  <StepAiReview
                    review={review}
                    reviewLoading={reviewLoading}
                    onRun={runAiReview}
                    onPublishAnyway={() => setStep(9)}
                  />
                )}
                {step === 9 && <StepVisibility form={form} onChange={patch} set={set} />}
                {step === 10 && (
                  <StepPublish
                    form={form}
                    preview={preview}
                    review={review}
                    acknowledged={acknowledged}
                    setAcknowledged={setAcknowledged}
                    onSaveDraft={() => saveDraftNow(false)}
                    onPublish={handlePublish}
                    submitting={submitting}
                    publishedSlug={publishedSlug}
                    hasTeam={hasTeam}
                    teamTotal={teamTotal}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {!isLast && (
            <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
              <Button variant="outline" disabled={step === 0 || submitting} onClick={goBack}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step !== 8 ? (
                <Button onClick={goNext} disabled={submitting} className="gradient-bg text-white">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={() => setStep(9)} variant="outline">
                  Continue to visibility <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DesktopSteps({
  step,
  onStep,
  hoverDisabled,
}: {
  step: number;
  onStep: (i: number) => void;
  hoverDisabled: boolean;
}) {
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onStep(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                active && "bg-primary/10 text-primary",
                !active && "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  done
                    ? "gradient-bg text-white"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ---- shared widgets -------------------------------------------------------

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            required ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          {required ? FIELD.required : FIELD.optional}
        </span>
      </div>
      {children}
      {hint ? <p className="text-xs font-medium text-red-500">{hint}</p> : null}
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <div className="text-right text-[10px] tabular-nums text-muted-foreground">
      {value.length}/{max}
    </div>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  type,
  required,
  hint,
  max = 300,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Input
        type={type ?? "text"}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("rounded-md", hint && "border-red-400")}
      />
      {max <= 1000 ? <Counter value={value} max={max} /> : null}
    </div>
  );
}

function TextAreaField({
  value,
  onChange,
  rows = 4,
  placeholder,
  max = 4000,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Textarea
        rows={rows}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md"
      />
      <Counter value={value} max={max} />
    </div>
  );
}

function LinesField({
  value,
  onChange,
  rows = 3,
  placeholder,
  max = 4000,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Textarea
        rows={rows}
        value={value.join("\n")}
        onChange={(e) => onChange(lineHelpers.join([], e.target.value))}
        placeholder={placeholder}
        className="rounded-md"
      />
      <p className="text-[10px] text-muted-foreground">One item per line</p>
    </div>
  );
}

function CsvField({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Input
        value={value.join(", ")}
        onChange={(e) => onChange(csvHelpers.split(e.target.value))}
        placeholder={placeholder}
        className="rounded-md"
      />
      <p className="text-[10px] text-muted-foreground">Comma separated</p>
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function CheckboxPills({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            selected.includes(o)
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/40",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function FileDrop({
  refs,
  onChange,
  multiple,
  accept,
  label,
  hint,
  onPick,
}: {
  refs: FileRef[];
  onChange: (refs: FileRef[]) => void;
  multiple?: boolean;
  accept: string;
  label: string;
  hint?: string;
  onPick: (e: ChangeEvent<HTMLInputElement>, onRefs: (refs: FileRef[]) => void) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="grid cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-background/60 p-5 text-center transition hover:border-primary/50">
        <Upload className="h-5 w-5 text-primary" />
        <div className="mt-1.5 text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {hint} · up to 25MB · images, PDF, PPT, ZIP, video
        </div>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => onPick(e, onChange)}
        />
      </label>
      {refs.length ? (
        <ul className="space-y-1.5">
          {refs.map((r) => (
            <li key={r.url} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{r.name || r.url.split("/").pop()}</span>
              {r.size ? <span className="shrink-0 text-xs text-muted-foreground">{fmtBytes(r.size)}</span> : null}
              <button
                type="button"
                onClick={() => onChange(refs.filter((x) => x.url !== r.url))}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SingleFileDrop({
  ref,
  onChange,
  accept,
  label,
  hint,
  onPick,
}: {
  ref: FileRef | null;
  onChange: (ref: FileRef | null) => void;
  accept: string;
  label: string;
  hint?: string;
  onPick: (e: ChangeEvent<HTMLInputElement>, onRefs: (refs: FileRef[]) => void) => void;
}) {
  return (
    <FileDrop
      refs={ref ? [ref] : []}
      onChange={(refs) => onChange(refs[0] ?? null)}
      accept={accept}
      label={ref ? ref.name || label : label}
      hint={hint}
      onPick={onPick}
    />
  );
}

const up = (arr: unknown[], i: number) => {
  const copy = [...arr];
  if (i > 0) [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
  return copy;
};
const down = (arr: unknown[], i: number) => {
  const copy = [...arr];
  if (i < copy.length - 1) [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
  return copy;
};

// ---- Step 1: Project details & team --------------------------------------

function StepBasics({
  form,
  onChange,
  clearHint,
  hints,
  teamTotal,
  hasTeam,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  clearHint: (f: string) => void;
  hints: FieldHints;
  teamTotal: number;
  hasTeam: boolean;
}) {
  const setTeamMember = (i: number, patch: Partial<FormState["team"][number]>) =>
    onChange((p) => {
      const team = p.team.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
      return { ...p, team, teamSize: team.length > 1 ? team.length : 1 };
    });
  const addMember = () => onChange((p) => ({ ...p, team: [...p.team, emptyTeamMember()] }));
  const removeMember = (i: number) =>
    onChange((p) => ({ ...p, team: p.team.filter((_, idx) => idx !== i), teamSize: Math.max(p.team.length - 1, 1) }));

  return (
    <>
      <Field label="Project name" required hint={hints.title}>
        <Input
          value={form.title}
          maxLength={160}
          onChange={(e) => {
            onChange((p) => ({ ...p, title: e.target.value }));
            clearHint("title");
          }}
          placeholder="MedAI Triage"
          aria-invalid={Boolean(hints.title)}
          className="rounded-md"
        />
      </Field>
      <Field label="Tagline / short description" required>
        <TextAreaField value={form.shortDescription} onChange={(v) => onChange((p) => ({ ...p, shortDescription: v }))} rows={2} max={300} placeholder="AI-powered emergency triage in under 30 seconds." />
      </Field>
      <Field label="One-line description">
        <TextAreaField value={form.oneLineDescription} onChange={(v) => onChange((p) => ({ ...p, oneLineDescription: v }))} rows={2} max={200} placeholder="A one-sentence explanation of what you built." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hackathon">
          <TextField value={form.hackathonName} onChange={(v) => onChange((p) => ({ ...p, hackathonName: v }))} placeholder="HackMIT 2025" />
        </Field>
        <Field label="Organizer">
          <TextField value={form.organizer} onChange={(v) => onChange((p) => ({ ...p, organizer: v }))} placeholder="MIT" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Year" hint={hints.year}>
          <Input
            type="number"
            value={form.year}
            onChange={(e) => {
              onChange((p) => ({ ...p, year: e.target.value }));
              clearHint("year");
            }}
            aria-invalid={Boolean(hints.year)}
            className="rounded-md"
          />
        </Field>
        <Field label="Category">
          <TextField value={form.category} onChange={(v) => onChange((p) => ({ ...p, category: v }))} placeholder="Healthcare" />
        </Field>
        <Field label="Difficulty">
          <SelectField
            value={form.difficulty}
            onChange={(v) => onChange((p) => ({ ...p, difficulty: v as FormState["difficulty"] }))}
            options={[
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "advanced", label: "Advanced" },
            ]}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Domain">
          <TextField value={form.domain} onChange={(v) => onChange((p) => ({ ...p, domain: v }))} placeholder="HealthTech" />
        </Field>
        <Field label="SDG alignment">
          <TextField value={form.sdgAlignment} onChange={(v) => onChange((p) => ({ ...p, sdgAlignment: v }))} placeholder="SDG 3 — Good Health" />
        </Field>
        <Field label="Project status">
          <SelectField
            value={form.projectStatus}
            onChange={(v) => onChange((p) => ({ ...p, projectStatus: v as FormState["projectStatus"] }))}
            options={[
              { value: "prototype", label: "Prototype" },
              { value: "in-progress", label: "In progress" },
              { value: "completed", label: "Completed" },
              { value: "deployed", label: "Deployed" },
            ]}
          />
        </Field>
      </div>
      <Field label="Team name">
        <TextField value={form.teamName} onChange={(v) => onChange((p) => ({ ...p, teamName: v }))} placeholder="Code Raiders" max={120} />
      </Field>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Team members</div>
            <div className="text-xs text-muted-foreground">Add everyone who contributed to the project.</div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addMember}>
            <Plus className="h-4 w-4" /> Add team member
          </Button>
        </div>
        {hints.teamContribution ? (
          <p className="mt-2 text-xs font-medium text-amber-600">{hints.teamContribution}</p>
        ) : null}
        {hasTeam ? (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Total contribution:</span>
            <span className={cn("font-semibold", teamTotal === 100 ? "text-emerald-600" : "text-amber-600")}>
              {teamTotal}% {teamTotal === 100 ? "✓" : "(aim for 100%)"}
            </span>
          </div>
        ) : null}
        <div className="mt-3 space-y-3">
          {form.team.map((m, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Team member {i + 1}
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => onChange((p) => ({ ...p, team: up(p.team, i) as FormState["team"] }))} className="text-muted-foreground disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={i === form.team.length - 1} onClick={() => onChange((p) => ({ ...p, team: down(p.team, i) as FormState["team"] }))} className="text-muted-foreground disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeMember(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove member">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Member name">
                  <TextField value={m.name} onChange={(v) => setTeamMember(i, { name: v })} placeholder="Aritra" max={120} />
                </Field>
                <Field label="Role">
                  <TextField value={m.role || ""} onChange={(v) => setTeamMember(i, { role: v })} placeholder="Full Stack Developer" max={120} />
                </Field>
                <Field label="University">
                  <TextField value={m.university || ""} onChange={(v) => setTeamMember(i, { university: v })} placeholder="Techno India University" max={160} />
                </Field>
                <Field label="Department">
                  <TextField value={m.department || ""} onChange={(v) => setTeamMember(i, { department: v })} placeholder="CSE" max={120} />
                </Field>
                <Field label="GitHub profile">
                  <TextField value={m.github || ""} onChange={(v) => setTeamMember(i, { github: v })} placeholder="https://github.com/aritra" max={300} />
                </Field>
                <Field label="LinkedIn profile">
                  <TextField value={m.linkedin || ""} onChange={(v) => setTeamMember(i, { linkedin: v })} placeholder="https://linkedin.com/in/aritra" max={300} />
                </Field>
                <Field label="Portfolio">
                  <TextField value={m.portfolio || ""} onChange={(v) => setTeamMember(i, { portfolio: v })} placeholder="https://aritra.dev" max={300} />
                </Field>
                <Field label="Contribution (%)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={m.contribution ?? 0}
                    onChange={(e) => setTeamMember(i, { contribution: Number(e.target.value) })}
                    className="rounded-md"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---- Step 2: Problem statement -------------------------------------------

function StepProblem({ form, onChange }: { form: FormState; onChange: (fn: (p: FormState) => FormState) => void }) {
  const p = form.problem;
  const setP = (patch: Partial<FormState["problem"]>) => onChange((s) => ({ ...s, problem: { ...s.problem, ...patch } }));
  return (
    <>
      <Field label="Describe the problem">
        <TextAreaField value={p.overview} onChange={(v) => setP({ overview: v })} rows={6} placeholder="What problem does this project solve?" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Why does this problem matter?">
          <TextAreaField value={p.whyImportant} onChange={(v) => setP({ whyImportant: v })} rows={3} />
        </Field>
        <Field label="Who is affected?">
          <TextAreaField value={p.affected} onChange={(v) => setP({ affected: v })} rows={3} placeholder="Students, hospitals, farmers, …" />
        </Field>
      </div>
      <Field label="Target users">
        <TextField value={p.targetUsers} onChange={(v) => setP({ targetUsers: v })} placeholder="Emergency room staff in tier-2 hospitals" />
      </Field>
      <Field label="Existing challenges">
        <LinesField value={p.challenges} onChange={(v) => setP({ challenges: v })} rows={4} placeholder="One challenge per line" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Problem severity">
          <SelectField
            value={p.severity}
            onChange={(v) => setP({ severity: v as FormState["problem"]["severity"] })}
            placeholder="Select severity"
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" },
            ]}
          />
        </Field>
        <Field label="Frequency of the problem">
          <TextField value={p.frequency} onChange={(v) => setP({ frequency: v })} placeholder="Daily / weekly / only during peak hours" />
        </Field>
      </div>
      <Field label="Current workaround">
        <TextAreaField value={p.workaround} onChange={(v) => setP({ workaround: v })} rows={3} placeholder="How do people cope with this today?" />
      </Field>
      <Field label="Real-world examples / evidence">
        <TextAreaField value={p.realWorldExamples} onChange={(v) => setP({ realWorldExamples: v })} rows={4} />
      </Field>
      <Field label="Expected impact">
        <TextAreaField value={p.expectedImpact} onChange={(v) => setP({ expectedImpact: v })} rows={3} placeholder="What changes if this is solved?" />
      </Field>
    </>
  );
}

// ---- Step 3: Research & validation ---------------------------------------

function StepResearch({
  form,
  onChange,
  pickFile,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  pickFile: (e: ChangeEvent<HTMLInputElement>, onRefs: (refs: FileRef[]) => void) => void;
}) {
  const r = form.research;
  const setR = (patch: Partial<FormState["research"]>) => onChange((s) => ({ ...s, research: { ...s.research, ...patch } }));
  return (
    <>
      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Research methods</div>
        <p className="text-xs text-muted-foreground">Select how you validated the problem.</p>
        <div className="mt-3">
          <CheckboxPills options={RESEARCH_METHODS} selected={r.methods} onChange={(v) => setR({ methods: v })} />
        </div>
      </div>
      <Field label="Research summary">
        <TextAreaField value={r.summary} onChange={(v) => setR({ summary: v })} rows={5} />
      </Field>
      <Field label="Research findings">
        <TextAreaField value={r.findings} onChange={(v) => setR({ findings: v })} rows={5} />
      </Field>
      <Field label="User validation">
        <TextAreaField value={r.validation} onChange={(v) => setR({ validation: v })} rows={4} placeholder="How did you validate the problem with real users?" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Number of users interviewed">
          <Input type="number" min={0} value={r.intervieweeCount} onChange={(e) => setR({ intervieweeCount: e.target.value })} className="rounded-md" />
        </Field>
        <Field label="Survey results">
          <TextAreaField value={r.surveyResults} onChange={(v) => setR({ surveyResults: v })} rows={2} />
        </Field>
        <Field label="Statistics / evidence">
          <TextAreaField value={r.statistics} onChange={(v) => setR({ statistics: v })} rows={2} />
        </Field>
      </div>
      <Field label="Key user insights">
        <LinesField value={r.insights} onChange={(v) => setR({ insights: v })} rows={3} />
      </Field>
      <Field label="Market observations">
        <TextAreaField value={r.marketObservations} onChange={(v) => setR({ marketObservations: v })} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Academic references (optional)">
          <LinesField value={r.academicReferences} onChange={(v) => setR({ academicReferences: v })} rows={3} placeholder="One reference per line" />
        </Field>
        <Field label="Research links">
          <LinesField value={r.researchLinks} onChange={(v) => setR({ researchLinks: v })} rows={3} placeholder="https://…" />
        </Field>
      </div>
      <Field label="References (one per line)">
        <LinesField value={r.references} onChange={(v) => setR({ references: v })} rows={3} placeholder="https://… or a citation" />
      </Field>
      <Field label="Research files (PDF, data)" hint={undefined}>
        <FileDrop refs={r.files} onChange={(refs) => setR({ files: refs })} multiple accept=".pdf,.doc,.docx,.zip" label="Upload research files" hint="PDF, DOC, ZIP" onPick={pickFile} />
      </Field>
    </>
  );
}

// ---- Step 4: Existing solutions ------------------------------------------

function StepExisting({
  form,
  onChange,
  set,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const setOne = (i: number, patch: Partial<FormState["existingSolutions"][number]>) =>
    onChange((p) => ({ ...p, existingSolutions: p.existingSolutions.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));
  const add = () => set("existingSolutions", [...form.existingSolutions, emptyExistingSolution()]);
  const remove = (i: number) => set("existingSolutions", form.existingSolutions.filter((_, idx) => idx !== i));

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Existing solutions / competitors</div>
          <p className="text-sm text-muted-foreground">Document what already exists and why your project is needed.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" /> Add solution
        </Button>
      </div>
      {form.existingSolutions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No existing solutions added yet. Click “Add solution” to document competitors.
        </div>
      ) : null}
      <div className="space-y-4">
        {form.existingSolutions.map((e, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Existing solution {i + 1}</div>
              <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <TextField value={e.name} onChange={(v) => setOne(i, { name: v })} placeholder="GitHub" max={200} />
              </Field>
              <Field label="Website">
                <TextField value={e.website || ""} onChange={(v) => setOne(i, { website: v })} placeholder="https://github.com/" max={300} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Description">
                <TextAreaField value={e.description || ""} onChange={(v) => setOne(i, { description: v })} rows={2} />
              </Field>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="What it does well">
                <TextAreaField value={e.strengths || ""} onChange={(v) => setOne(i, { strengths: v })} rows={3} />
              </Field>
              <Field label="Limitations">
                <TextAreaField value={e.limitations || ""} onChange={(v) => setOne(i, { limitations: v })} rows={3} />
              </Field>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Difference from our project">
                <TextAreaField value={e.difference || ""} onChange={(v) => setOne(i, { difference: v })} rows={2} />
              </Field>
              <Field label="Why our solution is needed">
                <TextAreaField value={e.whyNeeded || ""} onChange={(v) => setOne(i, { whyNeeded: v })} rows={2} />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Step 5: Solution & features -----------------------------------------

function StepSolution({
  form,
  onChange,
  set,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const s = form.solution;
  const setS = (patch: Partial<FormState["solution"]>) => onChange((x) => ({ ...x, solution: { ...x.solution, ...patch } }));

  const setFeature = (i: number, patch: Partial<FormState["features"][number]>) =>
    onChange((p) => ({ ...p, features: p.features.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }));

  return (
    <>
      <Field label="Solution overview">
        <TextAreaField value={s.overview} onChange={(v) => setS({ overview: v })} rows={4} />
      </Field>
      <Field label="Complete solution description">
        <TextAreaField value={s.description} onChange={(v) => setS({ description: v })} rows={6} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="USP (unique selling point)">
          <TextAreaField value={s.usp} onChange={(v) => setS({ usp: v })} rows={3} />
        </Field>
        <Field label="Innovation">
          <TextAreaField value={s.innovation} onChange={(v) => setS({ innovation: v })} rows={3} />
        </Field>
      </div>
      <Field label="Core workflow">
        <TextAreaField value={s.coreWorkflow} onChange={(v) => setS({ coreWorkflow: v })} rows={4} placeholder="Step by step how the user achieves the outcome." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Expected benefits">
          <LinesField value={s.expectedBenefits} onChange={(v) => setS({ expectedBenefits: v })} rows={3} />
        </Field>
        <Field label="Success criteria">
          <LinesField value={s.successCriteria} onChange={(v) => setS({ successCriteria: v })} rows={3} />
        </Field>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Feature breakdown</div>
            <div className="text-xs text-muted-foreground">List the key features of your solution.</div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => set("features", [...form.features, emptyFeature()])}>
            <Plus className="h-4 w-4" /> Add feature
          </Button>
        </div>
        <div className="mt-3 space-y-4">
          {form.features.map((f, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature {i + 1}</div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => onChange((p) => ({ ...p, features: up(p.features, i) as FormState["features"] }))} className="text-muted-foreground disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={i === form.features.length - 1} onClick={() => onChange((p) => ({ ...p, features: down(p.features, i) as FormState["features"] }))} className="text-muted-foreground disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => set("features", form.features.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remove feature">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Feature name">
                  <TextField value={f.name} onChange={(v) => setFeature(i, { name: v })} max={200} />
                </Field>
                <Field label="Problem solved">
                  <TextAreaField value={f.problemSolved || ""} onChange={(v) => setFeature(i, { problemSolved: v })} rows={2} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <TextAreaField value={f.description || ""} onChange={(v) => setFeature(i, { description: v })} rows={3} />
                  </Field>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Priority">
                  <SelectField
                    value={f.priority || "must-have"}
                    onChange={(v) => setFeature(i, { priority: v as FormState["features"][number]["priority"] })}
                    options={[
                      { value: "must-have", label: "Must Have" },
                      { value: "should-have", label: "Should Have" },
                      { value: "could-have", label: "Could Have" },
                      { value: "future", label: "Future" },
                    ]}
                  />
                </Field>
                <Field label="Status">
                  <SelectField
                    value={f.status || "planned"}
                    onChange={(v) => setFeature(i, { status: v as FormState["features"][number]["status"] })}
                    options={[
                      { value: "planned", label: "Planned" },
                      { value: "in-development", label: "In Development" },
                      { value: "completed", label: "Completed" },
                      { value: "future", label: "Future" },
                    ]}
                  />
                </Field>
                <Field label="Future improvement">
                  <TextAreaField value={f.futureImprovement || ""} onChange={(v) => setFeature(i, { futureImprovement: v })} rows={2} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---- Step 6: Architecture & technical details ----------------------------

function StepArchitecture({
  form,
  onChange,
  set,
  pickFile,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  pickFile: (e: ChangeEvent<HTMLInputElement>, onRefs: (refs: FileRef[]) => void) => void;
}) {
  const a = form.architecture;
  const setA = (patch: Partial<FormState["architecture"]>) => onChange((s) => ({ ...s, architecture: { ...s.architecture, ...patch } }));
  const t = form.techStack;
  const setT = (patch: Partial<FormState["techStack"]>) => onChange((s) => ({ ...s, techStack: { ...s.techStack, ...patch } }));

  const setApi = (i: number, patch: Partial<FormState["architecture"]["apiIntegrations"][number]>) =>
    onChange((p) => ({
      ...p,
      architecture: { ...p.architecture, apiIntegrations: p.architecture.apiIntegrations.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) },
    }));

  return (
    <>
      <Field label="System architecture description">
        <TextAreaField value={a.description} onChange={(v) => setA({ description: v })} rows={5} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Architecture diagram">
          <SingleFileDrop ref={a.diagram} onChange={(ref) => setA({ diagram: ref })} accept="image/*,.pdf" label="Upload architecture diagram" hint="PNG, JPG, PDF" onPick={pickFile} />
        </Field>
        <Field label="Data flow description">
          <TextAreaField value={a.dataFlowDescription} onChange={(v) => setA({ dataFlowDescription: v })} rows={3} />
        </Field>
        <Field label="Data flow diagram">
          <SingleFileDrop ref={a.dataFlowDiagram} onChange={(ref) => setA({ dataFlowDiagram: ref })} accept="image/*,.pdf" label="Upload data flow diagram" hint="PNG, JPG, PDF" onPick={pickFile} />
        </Field>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Database design</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Database type">
            <TextField value={a.databaseType} onChange={(v) => setA({ databaseType: v })} placeholder="MongoDB" max={120} />
          </Field>
          <Field label="Database description">
            <TextAreaField value={a.databaseDescription} onChange={(v) => setA({ databaseDescription: v })} rows={2} />
          </Field>
          <Field label="ER diagram">
            <SingleFileDrop ref={a.erDiagram} onChange={(ref) => setA({ erDiagram: ref })} accept="image/*,.pdf" label="Upload ER diagram" hint="PNG, JPG, PDF" onPick={pickFile} />
          </Field>
          <Field label="Scalability notes">
            <TextAreaField value={a.scalabilityNotes} onChange={(v) => setA({ scalabilityNotes: v })} rows={2} />
          </Field>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Field label="Collections / tables">
            <LinesField value={a.collections} onChange={(v) => setA({ collections: v })} rows={3} />
          </Field>
          <Field label="Relationships">
            <LinesField value={a.relationships} onChange={(v) => setA({ relationships: v })} rows={3} />
          </Field>
          <Field label="Indexes">
            <LinesField value={a.indexes} onChange={(v) => setA({ indexes: v })} rows={3} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Technology stack</div>
        <p className="text-xs text-muted-foreground">Group your technology into categories.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {t.categories.map((c) => (
            <Field key={c.key} label={c.label}>
              <CsvField
                value={c.value.split(",").map((x) => x.trim()).filter(Boolean)}
                onChange={(v) => setT({ categories: t.categories.map((x) => (x.key === c.key ? { ...x, value: v.join(", ") } : x)) })}
                placeholder="e.g. React, Tailwind"
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Infrastructure</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Hosting">
            <TextField value={t.infrastructureHosting} onChange={(v) => setT({ infrastructureHosting: v })} placeholder="Vercel, Render, AWS…" />
          </Field>
          <Field label="Storage">
            <TextField value={t.infrastructureStorage} onChange={(v) => setT({ infrastructureStorage: v })} placeholder="S3, Cloudinary…" />
          </Field>
          <Field label="CDN">
            <TextField value={t.infrastructureCdn} onChange={(v) => setT({ infrastructureCdn: v })} placeholder="Cloudflare" />
          </Field>
          <Field label="CI/CD">
            <TextField value={t.infrastructureCiCd} onChange={(v) => setT({ infrastructureCiCd: v })} placeholder="GitHub Actions" />
          </Field>
          <Field label="Monitoring">
            <TextField value={t.infrastructureMonitoring} onChange={(v) => setT({ infrastructureMonitoring: v })} placeholder="Sentry, Grafana" />
          </Field>
          <Field label="GitHub repository">
            <TextField value={t.githubRepository} onChange={(v) => setT({ githubRepository: v })} placeholder="https://github.com/you/project" max={300} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">API & integrations</div>
            <div className="text-xs text-muted-foreground">Document the external services you integrate with.</div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange((p) => ({ ...p, architecture: { ...p.architecture, apiIntegrations: [...p.architecture.apiIntegrations, { name: "", purpose: "", provider: "", documentationUrl: "", authType: "" }] } }))}>
            <Plus className="h-4 w-4" /> Add API
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {a.apiIntegrations.map((api, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API {i + 1}</div>
                <button type="button" onClick={() => onChange((p) => ({ ...p, architecture: { ...p.architecture, apiIntegrations: p.architecture.apiIntegrations.filter((_, idx) => idx !== i) } }))} className="text-muted-foreground hover:text-destructive" aria-label="Remove API">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="API name">
                  <TextField value={api.name} onChange={(v) => setApi(i, { name: v })} max={200} />
                </Field>
                <Field label="Purpose">
                  <TextField value={api.purpose || ""} onChange={(v) => setApi(i, { purpose: v })} />
                </Field>
                <Field label="Provider">
                  <TextField value={api.provider || ""} onChange={(v) => setApi(i, { provider: v })} />
                </Field>
                <Field label="Documentation URL">
                  <TextField value={api.documentationUrl || ""} onChange={(v) => setApi(i, { documentationUrl: v })} placeholder="https://…" max={300} />
                </Field>
                <Field label="Authentication type">
                  <TextField value={api.authType || ""} onChange={(v) => setApi(i, { authType: v })} placeholder="API key, OAuth…" max={120} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">UI/UX design</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Figma URL">
            <TextField value={a.figmaUrl} onChange={(v) => setA({ figmaUrl: v })} placeholder="https://figma.com/file/…" max={300} />
          </Field>
          <Field label="Design system">
            <TextField value={a.designSystem} onChange={(v) => setA({ designSystem: v })} placeholder="shadcn/ui, Material…" />
          </Field>
          <Field label="User flow">
            <TextAreaField value={a.userFlow} onChange={(v) => setA({ userFlow: v })} rows={3} />
          </Field>
          <Field label="Accessibility notes">
            <TextAreaField value={a.accessibilityNotes} onChange={(v) => setA({ accessibilityNotes: v })} rows={3} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="UI screenshots">
            <FileDrop refs={a.screenshots} onChange={(refs) => setA({ screenshots: refs })} multiple accept="image/*" label="Upload UI screenshots" hint="PNG, JPG, WebP" onPick={pickFile} />
          </Field>
        </div>
      </div>
    </>
  );
}

// ---- Step 7: Files, presentation & demo ----------------------------------

function StepFiles({
  form,
  onChange,
  set,
  pickFile,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  pickFile: (e: ChangeEvent<HTMLInputElement>, onRefs: (refs: FileRef[]) => void) => void;
}) {
  const pr = form.presentation;
  const setP = (patch: Partial<FormState["presentation"]>) => onChange((s) => ({ ...s, presentation: { ...s.presentation, ...patch } }));
  return (
    <>
      <Field label="Cover image">
        <SingleFileDrop ref={form.cover} onChange={(ref) => onChange((s) => ({ ...s, cover: ref }))} accept="image/*" label={form.cover ? form.cover.name || "Cover image" : "Click to upload cover"} hint="PNG, JPG, WebP, GIF, SVG" onPick={pickFile} />
      </Field>
      <Field label="Additional files (PPT, PDF, ZIP, video)">
        <FileDrop refs={form.additionalFiles} onChange={(refs) => onChange((s) => ({ ...s, additionalFiles: refs }))} multiple accept=".pdf,.ppt,.pptx,.zip,.doc,.docx,image/*,video/*" label="Upload additional files" hint="PPT, PPTX, PDF, ZIP, video" onPick={pickFile} />
      </Field>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Presentation</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Pitch deck">
            <SingleFileDrop ref={pr.pitchDeck} onChange={(ref) => setP({ pitchDeck: ref })} accept=".pdf,.ppt,.pptx" label="Upload pitch deck" hint="PPT, PPTX, PDF" onPick={pickFile} />
          </Field>
          <Field label="Presentation notes">
            <TextAreaField value={pr.notes} onChange={(v) => setP({ notes: v })} rows={3} />
          </Field>
          <Field label="Business model">
            <TextAreaField value={pr.businessModel} onChange={(v) => setP({ businessModel: v })} rows={3} />
          </Field>
          <Field label="Demo instructions">
            <TextAreaField value={pr.demoInstructions} onChange={(v) => setP({ demoInstructions: v })} rows={3} placeholder="How should the demo be presented?" />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Demo</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Live demo URL">
            <TextField value={pr.liveDemoUrl} onChange={(v) => setP({ liveDemoUrl: v })} placeholder="https://…" max={300} />
          </Field>
          <Field label="Demo video URL">
            <TextField value={pr.demoVideoUrl} onChange={(v) => setP({ demoVideoUrl: v })} placeholder="https://youtube.com/watch?v=…" max={300} />
          </Field>
          <Field label="Demo credentials (private)">
            <TextField value={pr.demoCredentials} onChange={(v) => setP({ demoCredentials: v })} placeholder="Only visible to your team" max={200} />
          </Field>
          <Field label="Demo notes">
            <TextAreaField value={pr.demoNotes} onChange={(v) => setP({ demoNotes: v })} rows={3} />
          </Field>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
          <ShieldAlert className="h-3.5 w-3.5" /> Credentials are stored privately and are never shown on the public page.
        </p>
      </div>
    </>
  );
}

// ---- Step 8: Development journey, judge feedback & lessons ---------------

function StepJourney({
  form,
  onChange,
  set,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const l = form.lessons;
  const setL = (patch: Partial<FormState["lessons"]>) => onChange((s) => ({ ...s, lessons: { ...s.lessons, ...patch } }));
  const setJourney = (i: number, patch: Partial<FormState["developmentJourney"][number]>) =>
    onChange((p) => ({ ...p, developmentJourney: p.developmentJourney.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) }));
  const setFeedback = (i: number, patch: Partial<FormState["judgeFeedback"][number]>) =>
    onChange((p) => ({ ...p, judgeFeedback: p.judgeFeedback.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) }));
  const setScope = (i: number, patch: Partial<FormState["futureScope"][number]>) =>
    onChange((p) => ({ ...p, futureScope: p.futureScope.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) }));

  return (
    <>
      <div className="rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Development journey</div>
            <p className="text-xs text-muted-foreground">Displayed chronologically on your case file.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => set("developmentJourney", [...form.developmentJourney, emptyJourney()])}>
            <Plus className="h-4 w-4" /> Add phase
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {form.developmentJourney.map((d, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phase {i + 1}</div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => onChange((p) => ({ ...p, developmentJourney: up(p.developmentJourney, i) as FormState["developmentJourney"] }))} className="text-muted-foreground disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={i === form.developmentJourney.length - 1} onClick={() => onChange((p) => ({ ...p, developmentJourney: down(p.developmentJourney, i) as FormState["developmentJourney"] }))} className="text-muted-foreground disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => set("developmentJourney", form.developmentJourney.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Phase">
                  <TextField value={d.phase || ""} onChange={(v) => setJourney(i, { phase: v })} placeholder="Research / Prototype / Testing…" max={120} />
                </Field>
                <Field label="Date / period">
                  <TextField value={d.period || ""} onChange={(v) => setJourney(i, { period: v })} placeholder="Week 1–2 (March 2025)" max={200} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Title">
                  <TextField value={d.title || ""} onChange={(v) => setJourney(i, { title: v })} max={200} />
                </Field>
                <div className="mt-3">
                  <Field label="Description">
                    <TextAreaField value={d.description || ""} onChange={(v) => setJourney(i, { description: v })} rows={3} />
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Problems encountered">
                    <TextAreaField value={d.problemsEncountered || ""} onChange={(v) => setJourney(i, { problemsEncountered: v })} rows={3} />
                  </Field>
                  <Field label="Solution implemented">
                    <TextAreaField value={d.solutionImplemented || ""} onChange={(v) => setJourney(i, { solutionImplemented: v })} rows={3} />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Judge feedback</div>
            <p className="text-xs text-muted-foreground">A core KnowHack feature — capture questions and feedback from judges.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => set("judgeFeedback", [...form.judgeFeedback, emptyFeedback()])}>
            <Plus className="h-4 w-4" /> Add feedback
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {form.judgeFeedback.map((f, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feedback {i + 1}</div>
                <button type="button" onClick={() => set("judgeFeedback", form.judgeFeedback.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Judge name (optional)">
                  <TextField value={f.judgeName || ""} onChange={(v) => setFeedback(i, { judgeName: v })} max={120} />
                </Field>
                <Field label="Score">
                  <TextField value={f.score || ""} onChange={(v) => setFeedback(i, { score: v })} placeholder="8/10" max={40} />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Judge question">
                  <TextAreaField value={f.question || ""} onChange={(v) => setFeedback(i, { question: v })} rows={2} />
                </Field>
                <Field label="Team answer">
                  <TextAreaField value={f.answer || ""} onChange={(v) => setFeedback(i, { answer: v })} rows={2} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Judge comment">
                  <TextAreaField value={f.comment || ""} onChange={(v) => setFeedback(i, { comment: v })} rows={2} />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Strengths">
                  <TextAreaField value={f.strengths || ""} onChange={(v) => setFeedback(i, { strengths: v })} rows={2} />
                </Field>
                <Field label="Weaknesses">
                  <TextAreaField value={f.weaknesses || ""} onChange={(v) => setFeedback(i, { weaknesses: v })} rows={2} />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Suggestions">
                  <TextAreaField value={f.suggestions || ""} onChange={(v) => setFeedback(i, { suggestions: v })} rows={2} />
                </Field>
                <Field label="Overall feedback">
                  <TextAreaField value={f.overallFeedback || ""} onChange={(v) => setFeedback(i, { overallFeedback: v })} rows={2} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Lessons learned</div>
        <p className="text-xs text-muted-foreground">What you’d share with the next team.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Challenges (one per line)">
            <LinesField value={l.challenges} onChange={(v) => setL({ challenges: v })} rows={3} />
          </Field>
          <Field label="What went well?">
            <LinesField value={l.wentWell} onChange={(v) => setL({ wentWell: v })} rows={3} />
          </Field>
          <Field label="What failed?">
            <LinesField value={l.failed} onChange={(v) => setL({ failed: v })} rows={3} />
          </Field>
          <Field label="What would you do differently?">
            <LinesField value={l.doDifferently} onChange={(v) => setL({ doDifferently: v })} rows={3} />
          </Field>
          <Field label="Future improvements (one per line)">
            <LinesField value={l.futureImprovements} onChange={(v) => setL({ futureImprovements: v })} rows={3} />
          </Field>
          <Field label="Features that should have been removed">
            <LinesField value={l.featuresRemoved} onChange={(v) => setL({ featuresRemoved: v })} rows={2} />
          </Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Biggest mistake">
            <TextAreaField value={l.biggestMistake} onChange={(v) => setL({ biggestMistake: v })} rows={2} />
          </Field>
          <Field label="Biggest achievement">
            <TextAreaField value={l.biggestAchievement} onChange={(v) => setL({ biggestAchievement: v })} rows={2} />
          </Field>
          <Field label="Technical lessons">
            <LinesField value={l.technicalLessons} onChange={(v) => setL({ technicalLessons: v })} rows={3} />
          </Field>
          <Field label="Product lessons">
            <LinesField value={l.productLessons} onChange={(v) => setL({ productLessons: v })} rows={3} />
          </Field>
          <Field label="Team lessons">
            <LinesField value={l.teamLessons} onChange={(v) => setL({ teamLessons: v })} rows={3} />
          </Field>
          <Field label="Business lessons">
            <LinesField value={l.businessLessons} onChange={(v) => setL({ businessLessons: v })} rows={3} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Future scope</div>
            <p className="text-xs text-muted-foreground">Structured roadmap beyond v1.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => set("futureScope", [...form.futureScope, emptyFutureScope()])}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {form.futureScope.map((f, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Future scope {i + 1}</div>
                <button type="button" onClick={() => set("futureScope", form.futureScope.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Title">
                  <TextField value={f.title || ""} onChange={(v) => setScope(i, { title: v })} placeholder="Version 2" max={200} />
                </Field>
                <Field label="Priority">
                  <SelectField
                    value={f.priority || "medium"}
                    onChange={(v) => setScope(i, { priority: v as FormState["futureScope"][number]["priority"] })}
                    options={[
                      { value: "high", label: "High" },
                      { value: "medium", label: "Medium" },
                      { value: "low", label: "Low" },
                    ]}
                  />
                </Field>
                <Field label="Expected timeline">
                  <TextField value={f.timeline || ""} onChange={(v) => setScope(i, { timeline: v })} placeholder="Q1 2027" max={200} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Description">
                  <TextAreaField value={f.description || ""} onChange={(v) => setScope(i, { description: v })} rows={2} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---- Step 9: AI review ----------------------------------------------------

function StepAiReview({
  review,
  reviewLoading,
  onRun,
  onPublishAnyway,
}: {
  review: AiReviewDTO | null;
  reviewLoading: boolean;
  onRun: () => void;
  onPublishAnyway: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-primary/5 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4 text-primary" /> KnowHack Case File audit
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze your Case File across all {review?.totalSections ?? 18} sections. This is a real audit of your content — it never blocks
          publishing, and it never invents facts about your project.
        </p>
      </div>

      {!review && !reviewLoading && (
        <div className="grid place-items-center gap-3 py-8 text-center">
          <Button onClick={onRun} className="gradient-bg text-white">
            Run AI review
          </Button>
        </div>
      )}

      {reviewLoading && (
        <div className="grid place-items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Auditing your Case File…</p>
        </div>
      )}

      {review && !reviewLoading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5">
            <div className="relative grid h-20 w-20 place-items-center">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${review.completeness}, 100`}
                />
              </svg>
              <span className="absolute text-lg font-bold">{review.completeness}%</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Case File completeness</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight">{review.completeness}%</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {review.completeSections} / {review.totalSections} sections complete
              </div>
            </div>
          </div>

          {review.warnings.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">Warnings</div>
              <ul className="space-y-1.5">
                {review.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" /> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.suggestions.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Suggestions</div>
              <ul className="space-y-1.5">
                {review.suggestions.map((s) => (
                  <li key={s} className="flex items-start gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.warnings.length === 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
              Great — no critical gaps detected in your Case File.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={onRun} variant="outline">
              Re-run review
            </Button>
            <Button onClick={onPublishAnyway} className="gradient-bg text-white">
              Publish anyway <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---- Step 10: Visibility --------------------------------------------------

function StepVisibility({
  form,
  onChange,
  set,
}: {
  form: FormState;
  onChange: (fn: (p: FormState) => FormState) => void;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <>
      <div className="grid gap-3">
        {VISIBILITY_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => set("visibility", o.key)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition",
              form.visibility === o.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <div className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2", form.visibility === o.key ? "border-primary" : "border-border")}>
              {form.visibility === o.key && <div className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <div>
              <div className="text-sm font-medium">{o.title}</div>
              <div className="text-xs text-muted-foreground">{o.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {form.visibility === "scheduled" && (
        <Field label="Release date">
          <Input
            type="date"
            value={form.scheduledReleaseDate}
            onChange={(e) => set("scheduledReleaseDate", e.target.value)}
            className="rounded-md"
          />
        </Field>
      )}

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">License & ownership</div>
        <div className="mt-3">
          <Field label="License">
            <div className="grid gap-2">
              {LICENSES.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => set("license", l.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                    form.license === l.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("grid h-3.5 w-3.5 place-items-center rounded-full border-2", form.license === l.key ? "border-primary" : "border-border")}>
                    {form.license === l.key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  {l.title}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <Switch checked={form.ownershipConfirmed} onCheckedChange={(v) => set("ownershipConfirmed", v)} />
            <span className="text-sm">
              I confirm I own or have permission to publish the submitted content.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <Switch checked={form.copyrightConfirmed} onCheckedChange={(v) => set("copyrightConfirmed", v)} />
            <span className="text-sm">I confirm the copyright confirmation for this project.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <Switch checked={form.contributorAttribution} onCheckedChange={(v) => set("contributorAttribution", v)} />
            <span className="text-sm">Include contributor attribution.</span>
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          KnowHack never claims ownership of your content — you keep full intellectual property.
        </p>
      </div>
    </>
  );
}

// ---- Step 11: Publish -----------------------------------------------------

function StepPublish({
  form,
  preview,
  review,
  acknowledged,
  setAcknowledged,
  onSaveDraft,
  onPublish,
  submitting,
  publishedSlug,
  hasTeam,
  teamTotal,
}: {
  form: FormState;
  preview: { completeness: number; warnings: string[]; suggestions: string[] };
  review: AiReviewDTO | null;
  acknowledged: boolean;
  setAcknowledged: (v: boolean) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  submitting: boolean;
  publishedSlug: string | null;
  hasTeam: boolean;
  teamTotal: number;
}) {
  const complete = review?.completeness ?? preview.completeness;
  const warnings = review?.warnings ?? preview.warnings;
  const nav = useNavigate();

  const sections: { label: string; ok: boolean }[] = [
    { label: "Project overview", ok: form.title.trim().length > 0 },
    { label: "Team details", ok: hasTeam },
    { label: "Problem statement", ok: form.problem.overview.trim().length > 0 },
    { label: "Research & validation", ok: Boolean(form.research.validation.trim() || form.research.summary.trim() || form.research.methods.length) },
    { label: "Existing solutions", ok: form.existingSolutions.length > 0 },
    { label: "Proposed solution", ok: Boolean(form.solution.overview.trim() || form.solution.description.trim()) },
    { label: "Feature breakdown", ok: form.features.length > 0 },
    { label: "System architecture", ok: Boolean(form.architecture.description.trim() || form.architecture.diagram) },
    { label: "Database design", ok: Boolean(form.architecture.databaseType.trim() || form.architecture.databaseDescription.trim()) },
    { label: "Technology stack", ok: form.techStack.categories.some((c) => c.value.trim()) },
    { label: "API & integrations", ok: form.architecture.apiIntegrations.length > 0 },
    { label: "UI/UX design", ok: Boolean(form.architecture.figmaUrl.trim() || form.architecture.designSystem.trim()) },
    { label: "Development journey", ok: form.developmentJourney.length > 0 },
    { label: "Presentation & demo", ok: Boolean(form.presentation.liveDemoUrl.trim() || form.presentation.demoVideoUrl.trim() || form.presentation.pitchDeck) },
    { label: "Judge feedback", ok: form.judgeFeedback.length > 0 },
    { label: "Lessons learned", ok: form.lessons.challenges.length > 0 || form.lessons.wentWell.length > 0 },
    { label: "Future scope", ok: form.futureScope.length > 0 || form.lessons.futureImprovements.length > 0 },
    { label: "AI generated metadata", ok: Boolean(review) },
  ];
  const completeSections = sections.filter((s) => s.ok).length;
  const shownComplete = Math.round((completeSections / sections.length) * 100);

  if (publishedSlug) {
    return (
      <div className="grid place-items-center py-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-bg text-white shadow-elegant">
          <PartyPopper className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Project published</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your KnowHack Case File is live.</p>
        <Button
          className="mt-6 gradient-bg text-white shadow-elegant"
          onClick={() => nav({ to: "/projects/$id", params: { id: publishedSlug } })}
        >
          View published project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5">
        <div className="relative grid h-16 w-16 place-items-center">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${complete}, 100`}
            />
          </svg>
          <span className="absolute text-sm font-bold">{complete}%</span>
        </div>
        <div>
          <div className="text-sm font-semibold">Case File summary</div>
          <div className="text-xs text-muted-foreground">
            {completeSections} / {sections.length} sections have content · estimated {shownComplete}%
          </div>
          {warnings.length > 0 && (
            <div className="mt-1 text-xs text-amber-600">
              {warnings.length} warning{warnings.length === 1 ? "" : "s"} — publishing is never blocked.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {sections.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]", s.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-secondary text-muted-foreground")}>
              {s.ok ? <Check className="h-3 w-3" /> : "—"}
            </span>
            <span className={cn(s.ok ? "" : "text-muted-foreground")}>{s.label}</span>
          </div>
        ))}
      </div>

      {warnings.filter((w) => !/team contributions/i.test(w)).length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">Warnings</div>
          <ul className="space-y-1 text-sm">
            {warnings.map((w) => (
              <li key={w} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" /> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border/60 p-4">
        <div className="text-sm font-semibold">Before you publish</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Project: <span className="font-medium text-foreground">{form.title}</span> · Published as{" "}
          <span className="font-medium capitalize">{form.visibility.replace(/-/g, " ")}</span>{" "}
          {hasTeam && `· Team contributions ${teamTotal}%`} · {form.license.replace(/-/g, " ")} license.
          {form.visibility === "scheduled" && form.scheduledReleaseDate ? (
            <> · Scheduled release: <span className="font-medium">{form.scheduledReleaseDate}</span></>
          ) : null}
        </p>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3">
            <Switch checked={acknowledged} onCheckedChange={setAcknowledged} />
            <span className="text-sm">
              I confirm that I own or have permission to publish the submitted content.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 opacity-70">
            <Switch checked={form.copyrightConfirmed} disabled />
            <span className="text-sm">Copyright confirmation {form.copyrightConfirmed ? "given" : "not given"}</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onSaveDraft}>
          <Save className="h-4 w-4" /> Save draft
        </Button>
        <Button onClick={onPublish} disabled={submitting || !acknowledged} className="gradient-bg text-white">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
            </>
          ) : (
            <>
              Publish project <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {!acknowledged && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <ShieldAlert className="h-3.5 w-3.5" /> Confirm the ownership checkbox above to publish.
        </p>
      )}
    </div>
  );
}