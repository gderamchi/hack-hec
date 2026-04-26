import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Complee" }] }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const role = useUserRole();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Optional ?redirect=/some/path — used by the reviewer accept-invite flow.
  const redirectAfter =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect")
      : null;

  const goPostAuth = () => {
    if (redirectAfter && redirectAfter.startsWith("/")) {
      window.location.assign(redirectAfter);
    } else if (role === "reviewer") {
      navigate({ to: "/review" });
    } else {
      navigate({ to: "/account" });
    }
  };

  useEffect(() => {
    // Wait for both auth and role to settle so reviewers go straight to /review
    if (!loading && user && role !== "loading") goPostAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, displayName);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    if (mode === "signup") {
      toast.success("Account created", {
        description: "Check your inbox to confirm your email, then sign in.",
      });
      setMode("signin");
    } else {
      toast.success("Welcome back");
      goPostAuth();
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/account",
    });
    if (result.error) {
      setErr(String(result.error.message ?? result.error));
      setBusy(false);
    }
  };

  return (
    <Chrome>
      <div className="max-w-[440px] mx-auto px-5 sm:px-6 py-12 sm:py-16">
        <Link
          to="/results"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <span className="text-[12px] uppercase tracking-[0.12em] text-brand font-semibold">
              Complee account
            </span>
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-navy">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
            Save your roadmap and pick up where you left off — on any device.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="mt-5 w-full inline-flex items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-navy hover:bg-surface-muted disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field
                label="Your name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Alex Martin"
                required
              />
            )}
            <Field
              label="Work email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="alex@flowpay.eu"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              required
            />
            {err && (
              <p className="text-[12px] text-danger">{err}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 disabled:opacity-50 shadow-sm"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
              className="font-medium text-brand hover:text-brand/80"
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </Chrome>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-navy mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
