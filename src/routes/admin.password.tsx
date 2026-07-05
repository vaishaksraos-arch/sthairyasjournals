import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { SecurePasswordInput, type SecurePasswordHandle } from "@/components/SecurePasswordInput";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin/password")({
  head: () => ({ meta: [{ title: "Change password — Sthairya's Physio Journal" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const { status } = useAdminGate();
  const navigate = useNavigate();
  const pw1 = useRef<SecurePasswordHandle>(null);
  const pw2 = useRef<SecurePasswordHandle>(null);
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
    const a = pw1.current?.getValue() ?? "";
    const b = pw2.current?.getValue() ?? "";
    if (a.length < 6) return toast.error("Password must be at least 6 characters");
    if (a !== b) return toast.error("Passwords don't match");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: a });
      if (error) throw error;
      pw1.current?.clear(); pw2.current?.clear();
      toast.success("Password updated");
      navigate({ to: "/admin", replace: true });
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
        <div className="mb-6"><BackButton fallback="/admin" label="Back" /></div>
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center mx-auto mb-4 shadow-lg shadow-primary/25">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl text-primary">Change password</h1>
          <p className="text-sm text-muted-foreground mt-2">Choose a new password for your account.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-500" autoComplete="off">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">New password</label>
            <SecurePasswordInput ref={pw1} required minLength={6}
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm new password</label>
            <SecurePasswordInput ref={pw2} required minLength={6}
              className="mt-1.5 w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-95 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99]">
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
