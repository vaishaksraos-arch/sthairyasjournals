import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin/password")({
  head: () => ({ meta: [{ title: "Change password — Sthairya's Physio Journal" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const { status } = useAdminGate();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  if (status !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-md mx-auto p-10 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-md mx-auto px-5 py-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl text-primary">Change password</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Choose a new password for your admin account.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">New password</label>
            <input
              type="password"
              required
              minLength={6}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm new password</label>
            <input
              type="password"
              required
              minLength={6}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition shadow-sm"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
