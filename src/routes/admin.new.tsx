import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BlogForm } from "@/components/BlogForm";
import { Header } from "@/components/Header";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { useServerFn } from "@tanstack/react-start";
import { upsertBlog } from "@/lib/blogs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/new")({
  head: () => ({ meta: [{ title: "New article — Sthairya's Physio Journal" }] }),
  component: NewBlog,
});

function NewBlog() {
  const { status, isEditor } = useAdminGate({ allowEditor: true });
  const navigate = useNavigate();
  const save = useServerFn(upsertBlog);

  if (status !== "admin") {
    return <div className="min-h-screen bg-background"><Header /><div className="max-w-3xl mx-auto p-10 text-center text-muted-foreground">Loading…</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        <h1 className="font-serif text-3xl mb-6">New article</h1>
        <BlogForm
          isAdmin={!isEditor}
          onSubmit={async (values) => {
            try {
              const row = await save({ data: values });
              toast.success("Article published");
              navigate({ to: "/admin/$id", params: { id: (row as { id: string }).id } });
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      </div>
    </div>
  );
}
