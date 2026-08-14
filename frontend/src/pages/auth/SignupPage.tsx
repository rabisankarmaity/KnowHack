import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Rocket } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { describeRequestError, retryNetworkBackoff } from "@/lib/api/client";

export function SignupPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [warming, setWarming] = useState(false);

  const [passError, setPassError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [userError, setUserError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Name must be at least 2 characters";
    if (!/^[a-z0-9_.-]{3,30}$/.test(username.trim().toLowerCase()))
      errs.username = "Username: letters, numbers, dots, dashes, underscores (3-30 chars)";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address";
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password))
      errs.password = "Password needs 8+ chars with upper, lower, number, and a special character";
    if (password !== confirm) errs.confirm = "Passwords don't match";
    if (!accept) errs.accept = "Please accept the Terms to continue";

    setNameError(errs.name ?? "");
    setUserError(errs.username ?? "");
    setEmailError(errs.email ?? "");
    setPassError(errs.password ?? "");
    setConfirmError(errs.confirm ?? "");

    if (Object.keys(errs).length) {
      const first = errs[Object.keys(errs)[0]];
      toast.error(first);
      return;
    }

    setSubmitting(true);
    setWarming(false);
    try {
      await retryNetworkBackoff(
        () =>
          register(
            {
              name: name.trim(),
              username: username.trim().toLowerCase(),
              email: email.trim().toLowerCase(),
              password,
            },
            { timeout: 8000 },
          ),
        { maxWaitMs: 25000, onRetry: () => setWarming(true) },
      );
      toast.success("Account created");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(describeRequestError(err));
    } finally {
      setSubmitting(false);
      setWarming(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever for students. Password needs 8+ chars incl. upper, lower, number, and a special character."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:opacity-80">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              placeholder="Ada Lovelace"
              aria-invalid={Boolean(nameError)}
            />
            {nameError && <p className="text-xs font-medium text-red-500">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUserError("");
              }}
              placeholder="ada.lovelace"
              pattern="[a-zA-Z0-9_.\-]{3,30}"
              aria-invalid={Boolean(userError)}
            />
            {userError && <p className="text-xs font-medium text-red-500">{userError}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            placeholder="you@university.edu"
            aria-invalid={Boolean(emailError)}
          />
          {emailError && <p className="text-xs font-medium text-red-500">{emailError}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPassError("");
              }}
              placeholder="••••••••"
              aria-invalid={Boolean(passError)}
            />
            {passError && <p className="text-xs font-medium text-red-500">{passError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setConfirmError("");
              }}
              placeholder="••••••••"
              aria-invalid={Boolean(confirmError)}
            />
            {confirmError && <p className="text-xs font-medium text-red-500">{confirmError}</p>}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="terms" checked={accept} onCheckedChange={(v) => setAccept(v === true)} />
          <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
            I agree to the{" "}
            <a href="#" className="text-primary">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary">
              Privacy Policy
            </a>
            .
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
              {warming ? "Server is starting…" : "Creating your vault…"}
            </>
          ) : (
            <>
              Create account <Rocket className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
