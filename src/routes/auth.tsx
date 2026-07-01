import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Sthairya's Physio Journal" }] }),
  component: AuthPage,
});

// Map friendly "admin" username to a real email under a reserved local domain.
const ADMIN_EMAIL = "admin@sthairya.local";

function toEmail(usernameOrEmail: string) {
  const v = usernameOrEmail.trim().toLowerCase();
  if (v === "admin") return ADMIN_EMAIL;
  if (v.includes("@")) return v;
  return `${v}@sthairya.local`;
}

function AuthPage() {
  const BOOTSTRAP_PASSWORD = "admin12345";
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const email = toEmail(username);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // If the admin account hasn't been created yet, bootstrap it now.
        // The DB trigger promotes the first ever user to admin automatically.
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
          navigate({ to: "/admin" });
          return;
        }
        throw error;
      }
      toast.success("Welcome back");
      navigate({ to: "/admin" });
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
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl text-primary">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Admin access to publish and manage articles.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Username</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
