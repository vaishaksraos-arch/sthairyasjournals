import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { deleteBlog, setBlogPublished } from "@/lib/blogs.functions";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Eye, EyeOff, KeyRound, Search, ArrowUp, Users, Settings, Filter } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Sthairya's Physio Journal" }] }),
  component: AdminIndex,
});

type Row = {
  id: string; slug: string; title: string; category: string;
  body_part: string | null; created_at: string; published: boolean;
  author_id: string | null; author_name: string | null;
};

function AdminIndex() {
  const { status, userId, isEditor } = useAdminGate({ allowEditor: true });
  const isAdmin = status === "admin" && !isEditor;
  const qc = useQueryClient();
  const remove = useServerFn(deleteBlog);
  const setPub = useServerFn(setBlogPublished);

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [bodyFilter, setBodyFilter] = useState("");
  const [visFilter, setVisFilter] = useState<"all" | "public" | "masked">("all");
  const [authorFilter, setAuthorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<"any" | "7d" | "30d" | "90d">("any");
  const [showFilters, setShowFilters] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    function onScroll() { setShowTop(window.scrollY > 300); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: blogs, refetch } = useQuery({
    queryKey: ["admin-blogs", userId, isAdmin],
    enabled: status === "admin",
    queryFn: async () => {
      // Editors: server RLS restricts to their own via UPDATE/DELETE/INSERT policies,
      // but SELECT policy is public-published-or-admin. We must scope client query too.
      let query = supabase.from("blogs")
        .select("id,slug,title,category,body_part,created_at,published,author_id,author_name")
        .order("created_at", { ascending: false });
      if (!isAdmin && userId) query = query.eq("author_id", userId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Row[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 86400000;
    const cutoff = dateFilter === "7d" ? now - 7 * dayMs : dateFilter === "30d" ? now - 30 * dayMs : dateFilter === "90d" ? now - 90 * dayMs : 0;
    return (blogs ?? []).filter((b) => {
      if (s && !`${b.title} ${b.category} ${b.body_part ?? ""} ${b.slug}`.toLowerCase().includes(s)) return false;
      if (catFilter && b.category !== catFilter) return false;
      if (bodyFilter && (b.body_part ?? "") !== bodyFilter) return false;
      if (visFilter === "public" && !b.published) return false;
      if (visFilter === "masked" && b.published) return false;
      if (authorFilter && b.author_id !== authorFilter) return false;
      if (cutoff && new Date(b.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [blogs, q, catFilter, bodyFilter, visFilter, authorFilter, dateFilter]);

  const categories = useMemo(() => Array.from(new Set((blogs ?? []).map((b) => b.category))).sort(), [blogs]);
  const bodyParts = useMemo(() => Array.from(new Set((blogs ?? []).map((b) => b.body_part).filter(Boolean) as string[])).sort(), [blogs]);
  const authors = useMemo(() => {
    const map = new Map<string, string>();
    (blogs ?? []).forEach((b) => { if (b.author_id) map.set(b.author_id, b.author_name || b.author_id.slice(0, 8)); });
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [blogs]);

  async function onDelete(id: string) {
    if (!confirm("Delete this article permanently?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Deleted");
      refetch();
      qc.invalidateQueries({ queryKey: ["blogs"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  async function onToggleMask(id: string, cur: boolean) {
    try {
      await setPub({ data: { id, published: !cur } });
      toast.success(cur ? "Masked" : "Made public");
      refetch();
      qc.invalidateQueries({ queryKey: ["blogs"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  if (status === "loading" || status === "unauth") {
    return <div className="min-h-screen bg-background"><Header /><div className="max-w-4xl mx-auto p-10 text-center text-muted-foreground">Loading…</div></div>;
  }
  if (status === "not-admin") {
    return (
      <div className="min-h-screen bg-background"><Header />
        <div className="max-w-md mx-auto p-16 text-center">
          <h1 className="font-serif text-3xl">Access denied</h1>
          <p className="mt-3 text-muted-foreground">Only admins or editors can access this dashboard.</p>
        </div>
      </div>
    );
  }

  const publicCount = (blogs ?? []).filter((b) => b.published).length;
  const maskedCount = (blogs ?? []).filter((b) => !b.published).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl md:text-4xl text-primary truncate">
              {isAdmin ? "Editorial dashboard" : "My articles"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="text-foreground font-medium">{publicCount}</span> public ·{" "}
              <span className="text-foreground font-medium">{maskedCount}</span> masked ·{" "}
              <span className="text-foreground font-medium">{blogs?.length ?? 0}</span> total
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {isAdmin && (
              <>
                <Link to="/admin/users" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border hover:bg-muted transition text-sm">
                  <Users className="w-4 h-4" /> <span className="hidden sm:inline">Users</span>
                </Link>
                <Link to="/admin/settings" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border hover:bg-muted transition text-sm">
                  <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Settings</span>
                </Link>
              </>
            )}
            <Link to="/admin/password" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border hover:bg-muted transition text-sm">
              <KeyRound className="w-4 h-4" /> <span className="hidden sm:inline">Password</span>
            </Link>
            <Link to="/admin/new" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition shadow-sm text-sm">
              <Plus className="w-4 h-4" /> New article
            </Link>
          </div>
        </div>

        {/* Search + filters */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search your articles by title, body part, or keyword..."
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button type="button" onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-1.5 h-11 px-3 rounded-lg border border-border hover:bg-muted text-sm">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>
          {showFilters && (
            <div className={`grid gap-2 ${isAdmin ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background text-sm">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={bodyFilter} onChange={(e) => setBodyFilter(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background text-sm">
                <option value="">All body parts</option>
                {bodyParts.map((b) => <option key={b}>{b}</option>)}
              </select>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as "any" | "7d" | "30d" | "90d")} className="h-9 px-2 rounded-md border border-border bg-background text-sm">
                <option value="any">Any date</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <select value={visFilter} onChange={(e) => setVisFilter(e.target.value as "all" | "public" | "masked")} className="h-9 px-2 rounded-md border border-border bg-background text-sm">
                <option value="all">All visibility</option>
                <option value="public">Public only</option>
                <option value="masked">Masked only</option>
              </select>
              {isAdmin && (
                <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background text-sm">
                  <option value="">All authors</option>
                  {authors.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {filtered.length === 0 && <div className="p-10 text-center text-muted-foreground">No articles match your filters.</div>}
          {filtered.map((b) => (
            <div key={b.id} className={`flex items-center gap-3 p-4 hover:bg-muted/40 transition ${!b.published ? "opacity-70" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
                  <span className="text-accent">{b.category}</span>
                  {b.body_part && <span className="text-muted-foreground">· {b.body_part}</span>}
                  {!b.published && <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">Masked</span>}
                  {isAdmin && b.author_name && <span className="text-muted-foreground">· {b.author_name}</span>}
                </div>
                <div className="font-medium truncate">{b.title}</div>
                <div className="text-xs text-muted-foreground truncate">/{b.slug}</div>
              </div>
              <button onClick={() => onToggleMask(b.id, b.published)} className="p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition" title={b.published ? "Mask" : "Unmask"}>
                {b.published ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              </button>
              <Link to="/admin/$id" params={{ id: b.id }} className="p-2 rounded-md hover:bg-background border border-transparent hover:border-border transition" title="Edit">
                <Edit3 className="w-4 h-4" />
              </Link>
              <button onClick={() => onDelete(b.id)} className="p-2 rounded-md hover:bg-background border border-transparent hover:border-destructive text-destructive transition" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-5 z-40 w-11 h-11 rounded-full bg-card border border-border shadow-lg grid place-items-center hover:bg-muted transition"
          aria-label="Back to top">
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
