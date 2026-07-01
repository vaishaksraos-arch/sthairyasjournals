import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ExternalLink, Youtube } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — KinetIQ` },
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

function BlogPage() {
  const { slug } = Route.useParams();
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
          <Link to="/" className="text-clay underline mt-4 inline-block">
            Back to articles
          </Link>
        </div>
      </div>
    );
  }

  const embed = blog.youtube_url ? ytEmbedUrl(blog.youtube_url) : null;
  const searchQuery = blog.youtube_search_query || blog.title;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    searchQuery + " physiotherapy",
  )}`;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <article className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition"
        >
          <ArrowLeft className="w-4 h-4" /> All articles
        </Link>

        <div className="text-[11px] uppercase tracking-[0.22em] text-clay font-medium mb-4">
          {blog.category}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl leading-[1.08] text-foreground">
          {blog.title}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          {blog.excerpt}
        </p>

        <div className="mt-8 aspect-[16/9] rounded-2xl overflow-hidden bg-surface text-surface-foreground flex items-center justify-center relative">
          <div className="absolute inset-0 grain opacity-30" />
          <span className="text-[9rem] leading-none">{blog.cover_emoji ?? "🧘"}</span>
        </div>

        <div className="mt-10 prose-kin text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{blog.content}</ReactMarkdown>
        </div>

        {/* Video */}
        <section className="mt-12 pt-8 border-t border-border">
          <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
            <Youtube className="w-5 h-5 text-clay" />
            Watch & learn
          </h3>
          {embed ? (
            <div className="aspect-video rounded-xl overflow-hidden border border-border">
              <iframe
                src={embed}
                title={blog.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border bg-card p-6 hover:border-clay/50 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Related videos on YouTube</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Search: <span className="italic">"{searchQuery}"</span>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-clay shrink-0" />
              </div>
            </a>
          )}
        </section>

        {/* References */}
        {blog.references_json && blog.references_json.length > 0 && (
          <section className="mt-10 pt-8 border-t border-border">
            <h3 className="font-serif text-xl mb-4">References & further reading</h3>
            <ol className="space-y-2">
              {blog.references_json.map((url, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-clay underline break-all inline-flex items-start gap-1.5"
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

        <div className="mt-12 text-xs text-muted-foreground italic">
          Educational content only. Always consult a licensed physiotherapist for
          diagnosis and treatment.
        </div>
      </article>
    </div>
  );
}
