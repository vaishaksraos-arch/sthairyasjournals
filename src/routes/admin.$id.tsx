import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogForm } from "@/components/BlogForm";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
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
  const { status, isEditor } = useAdminGate({ allowEditor: true });
  const isAdmin = status === "admin" && !isEditor;
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

  const { data: users } = useQuery({
    queryKey: ["users-list"],
    enabled: status === "admin" && isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,display_name,username");
      return (data ?? []).map((p) => ({
        id: p.id,
        label: p.full_name || p.display_name || p.username || p.id.slice(0, 8),
      }));
    },
  });

  if (status !== "admin" || isLoading || !blog) {
    return <div className="min-h-screen bg-background"><Header /><div className="max-w-3xl mx-auto p-10 text-center text-muted-foreground">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        <h1 className="font-serif text-3xl mb-6">Edit article</h1>
        <BlogForm
          isAdmin={isAdmin}
          users={users ?? []}
          initial={{
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            category: blog.category,
            body_part: blog.body_part ?? "",
            excerpt: blog.excerpt,
            content: blog.content,
            youtube_url: blog.youtube_url ?? "",
            youtube_search_query: blog.youtube_search_query ?? "",
            cover_emoji: blog.cover_emoji ?? "🧘",
            cover_image_url: blog.cover_image_url ?? "",
            author_name: blog.author_name ?? "",
            author_qualification: blog.author_qualification ?? "",
            author_photo_url: blog.author_photo_url ?? "",
            references: Array.isArray(blog.references_json) ? (blog.references_json as string[]) : [],
            published: blog.published,
            show_assessment: blog.show_assessment,
            show_treatment: blog.show_treatment,
            show_exercises: blog.show_exercises,
          }}
          onSubmit={async (values) => {
            try {
              await save({ data: { ...values, id: blog.id } });
              toast.success("Saved");
              navigate({ to: "/admin" });
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      </div>
    </div>
  );
}
