import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useMemo, useState } from "react";
import { Search, ArrowRight, BookOpen, Lightbulb, GraduationCap, HeartPulse, Activity, Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sthairya's Physio Journal — Physiotherapy, made clear" },
      { name: "description", content: "Evidence-based articles on physiotherapy conditions, treatments, and recent advances from Sthairya Physiocare." },
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
  cover_image_url: string | null;
  created_at: string;
  author_id: string | null;
};

function Index() {
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id,slug,title,category,excerpt,cover_emoji,cover_image_url,created_at,author_id")
        .eq("published", true)
        .not("author_id", "is", null)
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
        return b.title.toLowerCase().includes(s) || b.excerpt.toLowerCase().includes(s) || b.category.toLowerCase().includes(s);
      }
      return true;
    });
  }, [blogs, q, cat]);

  const featured = !q && !cat ? blogs?.[0] : undefined;

  function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setQ(qDraft.trim());
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-surface text-primary-foreground">
        <div className="absolute inset-0 grain opacity-20" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 relative">
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.02] max-w-4xl">
            Physiotherapy,{" "}
            <span className="italic text-accent">made clear.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-primary-foreground/85 max-w-2xl leading-relaxed">
            Physiotherapy is the science of restoring movement — helping people
            recover from injury, manage pain, rebuild strength after surgery or
            stroke, and stay active for life. Explore in-depth guides on the
            conditions physiotherapists treat every day, with exercises, videos
            and research to make sense of them.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-2 md:gap-6 max-w-lg text-xs md:text-sm">
            {[
              { icon: BookOpen, label: "Evidence-based" },
              { icon: Lightbulb, label: "Actionable tips" },
              { icon: GraduationCap, label: "Clinician-written" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-primary-foreground/85">
                <Icon className="w-4 h-4 text-accent shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intro pillars */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-12 md:pt-16">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: HeartPulse, title: "What physiotherapy treats", body: "Musculoskeletal pain, sports injuries, post-surgical recovery, arthritis, neurological conditions, respiratory illness, and age-related mobility loss." },
            { icon: Activity, title: "How treatment works", body: "A physiotherapist assesses movement, strength, and pain, then combines manual therapy, targeted exercise, education, and modalities like ultrasound or dry needling." },
            { icon: Brain, title: "Why it matters", body: "Physiotherapy restores independence, prevents surgery in many cases, and delivers lasting relief by treating the cause of dysfunction — not just the symptom." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 hover:border-accent/40 transition">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-foreground mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search bar (below why-it-matters, above filter chips) */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pt-10">
        <form onSubmit={runSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Search a condition, joint or treatment…"
              className="w-full pl-10 pr-4 h-12 rounded-xl border border-border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 shadow-sm transition"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition inline-flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" /> Find
          </button>
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); setQDraft(""); }}
              className="h-12 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted transition"
            >
              Clear
            </button>
          )}
        </form>
      </section>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-6">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={() => setCat(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${
                !cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-accent/60 bg-card"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c === cat ? null : c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${
                  cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-accent/60 bg-card"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Featured */}
      {featured && (
        <section className="max-w-6xl mx-auto px-5 md:px-8 pt-8">
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
            className="group block relative rounded-3xl border border-border bg-card overflow-hidden hover:border-accent/50 hover:shadow-xl hover:shadow-primary/10 transition-all"
          >
            <div className="grid md:grid-cols-[1.2fr_1fr]">
              <div className="p-8 md:p-12">
                <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">
                  Featured · {featured.category}
                </div>
                <h2 className="font-serif text-3xl md:text-4xl leading-tight text-foreground group-hover:text-primary transition">
                  {featured.title}
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">{featured.excerpt}</p>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary to-surface text-primary-foreground flex items-center justify-center p-10 md:p-14 relative overflow-hidden min-h-[220px]">
                <div className="absolute inset-0 grain opacity-25" />
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-accent/30 blur-3xl" />
                {featured.cover_image_url ? (
                  <img src={featured.cover_image_url} alt="" className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <div className="text-[7rem] md:text-[9rem] leading-none relative drop-shadow-lg">
                    {featured.cover_emoji ?? "🧘"}
                  </div>
                )}
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif text-2xl md:text-3xl text-primary">
            {q || cat ? "Results" : "Latest articles"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "article" : "articles"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">No articles here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(featured ? filtered.slice(1) : filtered).map((b, i) => (
              <Link
                key={b.id}
                to="/blog/$slug"
                params={{ slug: b.slug }}
                className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all"
              >
                <div className={`aspect-[16/10] flex items-center justify-center relative overflow-hidden ${
                  i % 3 === 0 ? "bg-gradient-to-br from-primary to-surface" :
                  i % 3 === 1 ? "bg-gradient-to-br from-accent to-primary" :
                  "bg-gradient-to-br from-surface to-accent"
                }`}>
                  {b.cover_image_url ? (
                    <img src={b.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0 grain opacity-25" />
                      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-primary-foreground/10 blur-2xl" />
                      <span className="text-6xl md:text-7xl relative drop-shadow-md group-hover:scale-110 transition-transform">
                        {b.cover_emoji ?? "🧘"}
                      </span>
                    </>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">
                    {b.category}
                  </div>
                  <h3 className="font-serif text-lg leading-snug text-foreground group-hover:text-primary transition">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                    {b.excerpt}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:gap-2 transition-all">
                    Read <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 py-10 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="font-serif logo-gradient-text text-sm mb-2 font-bold">Sthairya's Physio Journal</div>
          <p>Educational content only. Not a substitute for individualised physiotherapy assessment.</p>
        </div>
      </footer>
    </div>
  );
}
