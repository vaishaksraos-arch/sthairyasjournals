import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useMemo, useState } from "react";
import { Search, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KinetIQ — Physiotherapy Journal" },
      { name: "description", content: "Evidence-based articles on physiotherapy conditions, treatments, and recent advances." },
    ],
  }),
  component: Index,
});

type Blog = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  cover_emoji: string | null;
  created_at: string;
};

function Index() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id,slug,title,category,excerpt,cover_emoji,created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Blog[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (blogs ?? []).forEach((b) => set.add(b.category));
    return Array.from(set).sort();
  }, [blogs]);

  const filtered = useMemo(() => {
    return (blogs ?? []).filter((b) => {
      if (cat && b.category !== cat) return false;
      if (q) {
        const s = q.toLowerCase();
        return b.title.toLowerCase().includes(s) || b.excerpt.toLowerCase().includes(s);
      }
      return true;
    });
  }, [blogs, q, cat]);

  const featured = blogs?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 grain opacity-60 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20 relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-clay font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Movement · Recovery · Evidence
          </div>
          <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] max-w-3xl text-foreground">
            Physiotherapy, <em className="text-clay not-italic">translated</em> for the people who need it.
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            In-depth articles on conditions physiotherapists treat every day —
            from frozen shoulder to stroke recovery — with the exercises, videos and
            research that make sense of them.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a condition, joint, treatment…"
                className="w-full pl-10 pr-4 h-11 rounded-lg border border-border bg-card text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-8">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={() => setCat(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${
                !cat ? "bg-surface text-surface-foreground border-surface" : "border-border hover:border-primary/40"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c === cat ? null : c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${
                  cat === c ? "bg-surface text-surface-foreground border-surface" : "border-border hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Featured */}
      {!q && !cat && featured && (
        <section className="max-w-6xl mx-auto px-5 md:px-8 pt-8">
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
            className="group block relative rounded-2xl border border-border bg-card overflow-hidden hover:border-clay/50 transition"
          >
            <div className="grid md:grid-cols-[1.2fr_1fr]">
              <div className="p-8 md:p-10">
                <div className="text-[11px] uppercase tracking-[0.22em] text-clay mb-3">
                  Featured · {featured.category}
                </div>
                <h2 className="font-serif text-3xl md:text-4xl leading-tight text-foreground">
                  {featured.title}
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">{featured.excerpt}</p>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-clay">
                  Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="bg-surface text-surface-foreground flex items-center justify-center p-10 md:p-14 relative overflow-hidden">
                <div className="absolute inset-0 grain opacity-30" />
                <div className="text-[8rem] md:text-[10rem] leading-none">{featured.cover_emoji ?? "🧘"}</div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif text-2xl">
            {q || cat ? "Results" : "Latest articles"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "article" : "articles"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">
              No articles yet.{" "}
              <Link to="/auth" className="text-clay underline">
                Sign in as admin
              </Link>{" "}
              to publish the first ones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(featured && !q && !cat ? filtered.slice(1) : filtered).map((b) => (
              <Link
                key={b.id}
                to="/blog/$slug"
                params={{ slug: b.slug }}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-clay/50 hover:shadow-sm transition"
              >
                <div className="aspect-[16/10] bg-secondary flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 grain opacity-30" />
                  <span className="text-6xl relative">{b.cover_emoji ?? "🧘"}</span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-clay mb-2">
                    {b.category}
                  </div>
                  <h3 className="font-serif text-lg leading-snug text-foreground group-hover:text-clay transition">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                    {b.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        KinetIQ · Educational content only. Not a substitute for individualised
        physiotherapy assessment.
      </footer>
    </div>
  );
}
