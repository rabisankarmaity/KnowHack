import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { describeRequestError, retryNetworkBackoff } from "@/lib/api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate({ to: (search.redirect as "/dashboard") || "/dashboard", replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, search.redirect]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setWarming(false);
    try {
      // If the backend is still cold-starting, wait/retry (bounded) instead of
      // failing immediately; the parallel warm-up usually has it awake by now.
      // A short per-attempt timeout keeps the backoff effective during a boot.
      await retryNetworkBackoff(
        () =>
          login({ emailOrUsername: emailOrUsername.trim(), password, remember }, { timeout: 8000 }),
        { maxWaitMs: 25000, onRetry: () => setWarming(true) },
      );
      toast.success("Welcome back");
      navigate({ to: (search.redirect as "/dashboard") || "/dashboard", replace: true });
    } catch (err) {
      toast.error(describeRequestError(err));
    } finally {
      setSubmitting(false);
      setWarming(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue building your vault."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-primary hover:opacity-80">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="emailOrUsername">Email or username</Label>
          <Input
            id="emailOrUsername"
            autoComplete="username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="you@university.edu"
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
          />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
            Remember me for 30 days
          </Label>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full gradient-bg text-white shadow-elegant hover:opacity-95"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />{" "}
              {warming ? "Server is starting…" : "Signing you in…"}
            </>
          ) : (
            <>
              Log in <Mail className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
