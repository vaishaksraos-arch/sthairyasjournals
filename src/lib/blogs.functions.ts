import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function getRoles(context: { supabase: any; userId: string }): Promise<string[]> {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  return (data ?? []).map((r: { role: string }) => r.role);
}
async function assertAdmin(context: { supabase: any; userId: string }) {
  const roles = await getRoles(context);
  if (!roles.includes("admin")) throw new Error("Forbidden: admin only");
}
async function assertAdminOrEditor(context: { supabase: any; userId: string }) {
  const roles = await getRoles(context);
  if (!roles.includes("admin") && !roles.includes("editor")) throw new Error("Forbidden");
  return { isAdmin: roles.includes("admin"), isEditor: roles.includes("editor") };
}

const UrlOptional = z.string().url().optional().or(z.literal(""));
const ImageOptional = z
  .string()
  .refine((s) => !s || /^(https?:\/\/|data:image\/)/i.test(s), "Invalid image URL")
  .optional()
  .or(z.literal(""));

const BlogInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  slug: z.string().min(2).max(120).optional(),
  category: z.string().min(2).max(80),
  body_part: z.string().max(80).optional().or(z.literal("")),
  excerpt: z.string().min(10).max(500),
  content: z.string().min(20).max(30000),
  youtube_url: UrlOptional,
  youtube_search_query: z.string().max(300).optional().or(z.literal("")),
  cover_emoji: z.string().max(8).optional().or(z.literal("")),
  cover_image_url: ImageOptional,
  author_name: z.string().max(120).optional().or(z.literal("")),
  author_qualification: z.string().max(200).optional().or(z.literal("")),
  author_photo_url: ImageOptional,
  author_id_override: z.string().uuid().optional(),
  references: z.array(z.string().url()).max(30).default([]),
  published: z.boolean().default(true),
  show_assessment: z.boolean().default(false),
  show_treatment: z.boolean().default(false),
  show_exercises: z.boolean().default(false),
});

export const upsertBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BlogInput.parse(input))
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertAdminOrEditor(context);

    // Load profile defaults for author auto-fill when creating new
    let authorId = context.userId;
    if (isAdmin && data.author_id_override) authorId = data.author_id_override;

    let authorName = data.author_name || "";
    let authorQual = data.author_qualification || "";
    let authorPhoto = data.author_photo_url || "";
    if (!data.id && (!authorName || !authorQual || !authorPhoto)) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("full_name,display_name,qualification,photo_url")
        .eq("id", authorId)
        .maybeSingle();
      if (prof) {
        authorName = authorName || prof.full_name || prof.display_name || "";
        authorQual = authorQual || prof.qualification || "";
        authorPhoto = authorPhoto || prof.photo_url || "";
      }
    }

    const payload: {
      title: string; slug: string; category: string; body_part: string | null;
      excerpt: string; content: string; youtube_url: string | null; youtube_search_query: string | null;
      cover_emoji: string; cover_image_url: string | null;
      author_name: string | null; author_qualification: string | null; author_photo_url: string | null;
      references_json: string[]; published: boolean;
      show_assessment: boolean; show_treatment: boolean; show_exercises: boolean;
      author_id?: string;
    } = {
      title: data.title,
      slug: data.slug?.trim() ? slugify(data.slug) : slugify(data.title),
      category: data.category,
      body_part: data.body_part || null,
      excerpt: data.excerpt,
      content: data.content,
      youtube_url: data.youtube_url || null,
      youtube_search_query: data.youtube_search_query || null,
      cover_emoji: data.cover_emoji || "🧘",
      cover_image_url: data.cover_image_url || null,
      author_name: authorName || null,
      author_qualification: authorQual || null,
      author_photo_url: authorPhoto || null,
      references_json: data.references,
      published: data.published,
      show_assessment: data.show_assessment,
      show_treatment: data.show_treatment,
      show_exercises: data.show_exercises,
    };

    if (data.id) {
      // Editors: RLS blocks editing others' articles. Admin: can reassign author.
      if (isAdmin && data.author_id_override) payload.author_id = data.author_id_override;
      const { data: row, error } = await context.supabase
        .from("blogs")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    payload.author_id = authorId;
    const { data: row, error } = await context.supabase
      .from("blogs")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrEditor(context);
    const { error } = await context.supabase.from("blogs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBlogPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), published: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrEditor(context);
    const { error } = await context.supabase.from("blogs").update({ published: data.published }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Site settings ----
export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      global_redirect_url: UrlOptional,
      fab_redirect_url: UrlOptional,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("site_settings")
      .update({
        global_redirect_url: data.global_redirect_url || null,
        fab_redirect_url: data.fab_redirect_url || null,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- User provisioning (admin only, uses service role) ----
export const provisionUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      full_name: z.string().min(2).max(120),
      username: z.string().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
      email: z.string().email(),
      password: z.string().min(8).max(128),
      qualification: z.string().max(200).optional().default(""),
      photo_url: UrlOptional,
      role: z.enum(["editor", "admin"]).default("editor"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.full_name, username: data.username },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;

    // Ensure profile fields
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      display_name: data.full_name,
      full_name: data.full_name,
      username: data.username,
      qualification: data.qualification || null,
      photo_url: data.photo_url || null,
    });

    // Role: the handle_new_user trigger already inserted 'user' (or 'admin' if first).
    // Remove default 'user' row and add requested role.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid).eq("role", "user");
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: data.role });

    return { ok: true, user_id: uid };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      full_name: z.string().min(2).max(120),
      username: z.string().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
      email: z.string().email(),
      password: z.string().min(8).max(128).optional().or(z.literal("")),
      qualification: z.string().max(200).optional().default(""),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updates: { email: string; password?: string; user_metadata: Record<string, string> } = {
      email: data.email,
      user_metadata: { display_name: data.full_name, username: data.username },
    };
    if (data.password) updates.password = data.password;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, updates);
    if (error) throw new Error(error.message);
    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id: data.user_id,
      full_name: data.full_name,
      display_name: data.full_name,
      username: data.username,
      qualification: data.qualification || null,
    });
    if (pErr) throw new Error(pErr.message);
    return { ok: true };
  });

// ---- AI seed generator (unchanged) ----
const CATEGORIES = [
  "Musculoskeletal", "Neurological", "Sports", "Post-Surgical",
  "Pediatric", "Geriatric", "Cardiopulmonary", "Women's Health",
  "Manual Therapy", "Exercise & Rehab",
];
const SEED_TOPICS = [
  "Low back pain: modern evidence-based physiotherapy",
  "Rotator cuff tendinopathy management",
  "Frozen shoulder (adhesive capsulitis) rehab",
];
const BlogGen = z.object({
  title: z.string(), slug: z.string(), category: z.string(),
  excerpt: z.string(), content: z.string(), cover_emoji: z.string(),
  youtube_search_query: z.string(), references_json: z.array(z.string()),
});
async function generateOne(apiKey: string, topic: string, category: string) {
  const gateway = createLovableAiGatewayProvider(apiKey);
  const { output } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    output: Output.object({ schema: BlogGen }),
    prompt: `Write an evidence-based physiotherapy blog post. Topic: "${topic}". Category: ${category}. Return JSON with title, slug, category, excerpt, content (markdown, 700-1100 words with ## Overview, ## Signs & Symptoms, ## Causes & Risk Factors, ## Physiotherapy Assessment, ## Treatment Approach, ## Exercises You Can Try, ## Recent Advances, ## When to See a Physiotherapist), cover_emoji, youtube_search_query, references_json (3-5 real URLs from NHS/Mayo/PubMed/PMC/physiopedia/APTA/JOSPT/BJSM).`,
  });
  return output;
}
export const seedBlogsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ count: z.number().int().min(1).max(10).default(5) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const { data: existing } = await context.supabase.from("blogs").select("title");
    const existingTitles = new Set((existing ?? []).map((r: { title: string }) => r.title));
    const remaining = SEED_TOPICS.filter((t) => !existingTitles.has(t));
    if (remaining.length === 0) return { created: 0, total: existing?.length ?? 0, done: true, errors: [] as string[] };
    const batch = remaining.slice(0, data.count);
    let created = 0;
    const errors: string[] = [];
    for (const topic of batch) {
      const category = CATEGORIES[Math.abs(hash(topic)) % CATEGORIES.length];
      try {
        const gen = await generateOne(apiKey, topic, category);
        const finalSlug = slugify(gen.slug || gen.title);
        const { error } = await context.supabase.from("blogs").insert({
          title: gen.title || topic,
          slug: finalSlug + "-" + Math.random().toString(36).slice(2, 6),
          category: gen.category || category,
          excerpt: gen.excerpt, content: gen.content,
          cover_emoji: gen.cover_emoji || "🧘",
          youtube_search_query: gen.youtube_search_query,
          references_json: gen.references_json ?? [],
          author_id: context.userId, published: true,
        });
        if (error) errors.push(`${topic}: ${error.message}`); else created++;
      } catch (e) { errors.push(`${topic}: ${(e as Error).message}`); }
    }
    const { count } = await context.supabase.from("blogs").select("*", { count: "exact", head: true });
    return { created, total: count ?? 0, done: remaining.length <= batch.length, errors };
  });
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
