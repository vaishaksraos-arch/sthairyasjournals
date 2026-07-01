import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogForm } from "@/components/BlogForm";
import { Header } from "@/components/Header";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { useServerFn } from "@tanstack/react-start";
import { upsertBlog } from "@/lib/blogs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/$id")({
  head: () => ({ meta: [{ title: "Edit article — Sthairya's Physio Journal" }] }),
  component: EditBlog,
});

function EditBlog() {
  const { id } = Route.useParams();
  const { status } = useAdminGate();
  const navigate = useNavigate();
  const save = useServerFn(upsertBlog);

  const { data: blog, isLoading } = useQuery({
    queryKey: ["blog-edit", id],
    enabled: status === "admin",
    queryFn: async () => {
      const { data, error } = await supabase.from("blogs").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (status !== "admin" || isLoading || !blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto p-10 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        <h1 className="font-serif text-3xl mb-6">Edit article</h1>
        <BlogForm
          initial={{
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            category: blog.category,
            excerpt: blog.excerpt,
            content: blog.content,
            youtube_url: blog.youtube_url ?? "",
            youtube_search_query: blog.youtube_search_query ?? "",
            cover_emoji: blog.cover_emoji ?? "🧘",
            references: Array.isArray(blog.references_json) ? (blog.references_json as string[]) : [],
            published: blog.published,
          }}
          onSubmit={async (values) => {
            try {
              await save({ data: { ...values, id: blog.id } });
              toast.success("Saved");
              navigate({ to: "/admin" });
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      </div>
    </div>
  );
}
