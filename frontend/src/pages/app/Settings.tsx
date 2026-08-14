import { useEffect, useState, type FormEvent } from "react";
import { Sun, Moon, Monitor, Save, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usersApi } from "@/lib/api/users";
import { apiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";

type Theme = "light" | "dark" | "system";

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [theme, setTheme] = useState<Theme>("light");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [college, setCollege] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("hv-theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const wantsDark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", wantsDark);
    localStorage.setItem("hv-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setBio(user.bio ?? "");
    setCollege(user.college ?? "");
    setGithub(user.github ?? "");
    setPortfolio(user.portfolio ?? "");
    setSkills((user.skills ?? []).join(", "));
  }, [user]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        college: college.trim(),
        github: github.trim(),
        portfolio: portfolio.trim(),
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage your profile and appearance.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <form onSubmit={onSave}>
            <Card
              title="Profile"
              desc="This information appears on your public profile."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </FormField>
                <FormField label="Email">
                  <Input value={user?.email ?? ""} disabled />
                </FormField>
                <FormField label="Username">
                  <Input value={user?.username ?? ""} disabled />
                </FormField>
                <FormField label="University / College">
                  <Input value={college} onChange={(e) => setCollege(e.target.value)} />
                </FormField>
                <FormField label="GitHub">
                  <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="username or full URL" />
                </FormField>
                <FormField label="Portfolio URL">
                  <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" />
                </FormField>
              </div>
              <FormField label="Bio">
                <Textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                />
              </FormField>
              <FormField label="Skills (comma separated)">
                <Input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="TypeScript, React, Python"
                />
              </FormField>
              <div className="mt-4 flex justify-end">
                <Button type="submit" disabled={saving} className="gradient-bg text-white">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save changes
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card title="Appearance" desc="Choose your theme. It applies across every page.">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { key: "light" as const, label: "Light", icon: Sun },
                  { key: "dark" as const, label: "Dark", icon: Moon },
                  { key: "system" as const, label: "System", icon: Monitor },
                ]
              ).map((o) => {
                const active = theme === o.key;
                const Icon = o.icon;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setTheme(o.key)}
                    className={cn(
                      "flex flex-col items-start rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-primary bg-primary/5 shadow-elegant"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                    <div className="mt-3 text-sm font-semibold">{o.label}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}