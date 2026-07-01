import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ExternalLink, Youtube, Calendar, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Sthairya's Physio Journal` },
    ],
  }),
  component: BlogPage,
});

type Blog = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  youtube_url: string | null;
  youtube_search_query: string | null;
  cover_emoji: string | null;
  references_json: string[];
  created_at: string;
  published: boolean;
};

function ytEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    return null;
  } catch {
    return null;
  }
}

function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function BlogPage() {
  const { slug } = Route.useParams();
  const [progress, setProgress] = useState(0);

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Blog;
    },
  });

  useEffect(() => {
    function onScroll() {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [blog]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 animate-pulse">
          <div className="h-6 w-24 bg-muted rounded mb-6" />
          <div className="h-12 w-full bg-muted rounded mb-3" />
          <div className="h-12 w-2/3 bg-muted rounded" />
        </div>
      </div>
    );
  }
  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-20 text-center">
          <p className="text-muted-foreground">Article not found.</p>
          <Link to="/" className="text-clay underline mt-4 inline-block">Back to articles</Link>
        </div>
      </div>
    );
  }

  const embed = blog.youtube_url ? ytEmbedUrl(blog.youtube_url) : null;
  const searchQuery = (blog.youtube_search_query || blog.title) + " physiotherapy";
  const searchEmbed = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  const videoSrc = embed ?? searchEmbed;
  const mins = readingTime(blog.content);
  const date = new Date(blog.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-transparent z-50">
        <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${progress}%` }} />
      </div>

      <Header />

      {/* Hero banner using logo palette */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-surface text-primary-foreground border-b border-border/40">
        <div className="absolute inset-0 grain opacity-20" />
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-accent/15 blur-3xl" />
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-16 relative">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-primary-foreground/70 hover:text-primary-foreground mb-6 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All articles
          </Link>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-4xl md:text-5xl leading-none drop-shadow-md">{blog.cover_emoji ?? "🧘"}</span>
            <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-[10px] uppercase tracking-[0.2em] font-semibold">
              {blog.category}
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl leading-[1.08] text-primary-foreground drop-shadow">
            {blog.title}
          </h1>
          <p className="mt-5 text-base md:text-lg text-primary-foreground/85 leading-relaxed max-w-2xl">
            {blog.excerpt}
          </p>
          <div className="mt-6 flex items-center gap-5 text-xs text-primary-foreground/70">
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {date}</span>
            <span className="inline-flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {mins} min read</span>
          </div>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="prose-kin text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{blog.content}</ReactMarkdown>
        </div>

        {/* Video — always embedded */}
        <section className="mt-12 pt-8 border-t border-border">
          <h3 className="font-serif text-2xl mb-4 flex items-center gap-2 text-primary">
            <Youtube className="w-6 h-6 text-destructive" />
            Watch & learn
          </h3>
          <div className="aspect-video rounded-2xl overflow-hidden border border-border bg-black shadow-lg">
            <iframe
              src={videoSrc}
              title={blog.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition"
          >
            More related videos on YouTube <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        {blog.references_json && blog.references_json.length > 0 && (
          <section className="mt-10 pt-8 border-t border-border">
            <h3 className="font-serif text-2xl mb-4 text-primary">References & further reading</h3>
            <ol className="space-y-2">
              {blog.references_json.map((url, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-primary underline underline-offset-4 break-all inline-flex items-start gap-1.5"
                  >
                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                    {url}
                    <ExternalLink className="w-3 h-3 mt-1 shrink-0" />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-12 p-5 rounded-2xl bg-muted/50 border border-border text-xs text-muted-foreground italic leading-relaxed">
          Educational content only. Always consult a licensed physiotherapist for
          diagnosis and treatment tailored to your condition.
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-primary transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all articles
          </Link>
        </div>
      </article>
    </div>
  );
}
