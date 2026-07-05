import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SecurePasswordInput, type SecurePasswordHandle } from "@/components/SecurePasswordInput";
import { toast } from "sonner";
import { PenTool } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Author Dashboard — Sthairya's Physio Journal" }] }),
  component: AuthPage,
});

const ADMIN_EMAIL = "admin@sthairya.local";

function toEmail(usernameOrEmail: string) {
  const v = usernameOrEmail.trim().toLowerCase();
  if (!v) return v;
  if (v === "admin") return ADMIN_EMAIL;
  if (v.includes("@")) return v;
  return `${v}@sthairya.local`;
}

function AuthPage() {
  const BOOTSTRAP_PASSWORD = "admin12345";
  const [username, setUsername] = useState("");
  const pwRef = useRef<SecurePasswordHandle>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const password = pwRef.current?.getValue() ?? "";
    if (!username.trim() || !password) {
      toast.error("Enter a username and password");
      return;
    }
    setLoading(true);
    const email = toEmail(username);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (
          email === ADMIN_EMAIL &&
          password === BOOTSTRAP_PASSWORD &&
          /invalid|not found|credentials/i.test(error.message)
        ) {
          const { error: upErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: { display_name: "admin" },
            },
          });
          if (upErr) throw upErr;
          toast.success("Admin account created — you're signed in.");
          pwRef.current?.clear();
          navigate({ to: "/admin", replace: true });
          return;
        }
        throw error;
      }
      toast.success("Welcome back");
      pwRef.current?.clear();
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-md mx-auto px-5 py-16">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center mx-auto mb-4 shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
            <PenTool className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl text-primary">Author Dashboard</h1>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-500"
          autoComplete="off"
        >
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              name="sthairya-user"
              spellCheck={false}
              placeholder=""
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
            <SecurePasswordInput
              ref={pwRef}
              required
              name="sthairya-pw"
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-95 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
