import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { updateSiteSettings } from "@/lib/blogs.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Sthairya's Physio Journal" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { status } = useAdminGate();
  const save = useServerFn(updateSiteSettings);
  const [global, setGlobal] = useState("");
  const [fab, setFab] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["site-settings"],
    enabled: status === "admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setGlobal(data.global_redirect_url ?? "");
      setFab(data.fab_redirect_url ?? "");
    }
  }, [data]);

  if (status !== "admin") {
    return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto p-10 text-center text-muted-foreground">Loading…</div></div>;
  }

  function validUrl(u: string) {
    if (!u) return true;
    try { const url = new URL(u); return url.protocol === "http:" || url.protocol === "https:"; }
    catch { return false; }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validUrl(global)) return toast.error("Global URL must start with http:// or https://");
    if (!validUrl(fab)) return toast.error("FAB URL must start with http:// or https://");
    setSaving(true);
    try {
      await save({ data: { global_redirect_url: global, fab_redirect_url: fab } });
      toast.success("Saved");
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-10">
        <div className="mb-6"><BackButton fallback="/admin" label="Back" /></div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Settings className="w-5 h-5" /></div>
          <h1 className="font-serif text-3xl text-primary">Global Link Configuration</h1>
        </div>
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Global Redirect URL</div>
            <input type="url" value={global} onChange={(e) => setGlobal(e.target.value)} placeholder="https://example.com"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="text-xs text-muted-foreground mt-1">Powers the "Return to Home" link in the header. Leave blank to route to the site root.</div>
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">FAB Redirect URL</div>
            <input type="url" value={fab} onChange={(e) => setFab(e.target.value)} placeholder="https://example.com"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="text-xs text-muted-foreground mt-1">Destination for the floating contact button. Blank hides the button.</div>
          </label>
          <button type="submit" disabled={saving} className="h-11 px-5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
