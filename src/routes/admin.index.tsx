import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { seedBlogsBatch, deleteBlog } from "@/lib/blogs.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — KinetIQ" }] }),
  component: AdminIndex,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  category: string;
  created_at: string;
  published: boolean;
};

function AdminIndex() {
  const { status } = useAdminGate();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ total: number; target: number } | null>(null);
  const seed = useServerFn(seedBlogsBatch);
  const remove = useServerFn(deleteBlog);

  const { data: blogs, refetch } = useQuery({
    queryKey: ["admin-blogs"],
    enabled: status === "admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id,slug,title,category,created_at,published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  async function runSeed(target: number) {
    setSeeding(true);
    setSeedProgress({ total: blogs?.length ?? 0, target });
    try {
      while (true) {
        const remaining = target - ((await getCount()) ?? 0);
        if (remaining <= 0) break;
        const batch = Math.min(5, remaining);
        const res = (await seed({ data: { count: batch } })) as {
          created: number;
          total: number;
          done: boolean;
          errors: string[];
        };
        setSeedProgress({ total: res.total, target });
        if (res.errors?.length) console.warn(res.errors);
        if (res.done || res.created === 0) break;
      }
      await qc.invalidateQueries({ queryKey: ["admin-blogs"] });
      await qc.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Seeding complete");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSeeding(false);
      setSeedProgress(null);
    }
  }

  async function getCount() {
    const { count } = await supabase
      .from("blogs")
      .select("*", { count: "exact", head: true });
    return count;
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this article?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Deleted");
      refetch();
      qc.invalidateQueries({ queryKey: ["blogs"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (status === "loading" || status === "unauth") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto p-10 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (status === "not-admin") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-md mx-auto p-16 text-center">
          <h1 className="font-serif text-3xl">Admin only</h1>
          <p className="mt-3 text-muted-foreground">
            Your account doesn't have admin access. Only admins can publish articles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl">Editorial dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {blogs?.length ?? 0} article{blogs?.length === 1 ? "" : "s"} published
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/new"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-surface text-surface-foreground font-medium hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" /> New article
            </Link>
            <button
              onClick={() => runSeed(100)}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-clay text-clay hover:bg-clay hover:text-clay-foreground disabled:opacity-50 transition"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {seeding ? "Generating…" : "Generate 100 seed articles"}
            </button>
          </div>
        </div>

        {seedProgress && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Seeding physiotherapy articles</span>
              <span className="text-muted-foreground">
                {seedProgress.total} / {seedProgress.target}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-clay transition-all"
                style={{ width: `${Math.min(100, (seedProgress.total / seedProgress.target) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Generated in batches of 5. This may take several minutes. Keep this tab open.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {(blogs ?? []).length === 0 && (
            <div className="p-10 text-center text-muted-foreground">
              No articles yet. Create one manually or generate the seed set.
            </div>
          )}
          {(blogs ?? []).map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-clay">{b.category}</div>
                <div className="font-medium truncate">{b.title}</div>
                <div className="text-xs text-muted-foreground truncate">/{b.slug}</div>
              </div>
              <Link
                to="/admin/$id"
                params={{ id: b.id }}
                className="p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition"
                aria-label="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => onDelete(b.id)}
                className="p-2 rounded-md hover:bg-background border border-transparent hover:border-destructive text-destructive transition"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
