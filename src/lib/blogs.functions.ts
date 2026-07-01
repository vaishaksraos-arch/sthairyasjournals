import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

// ---- helpers ----
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

// ---- Blog CRUD ----
const BlogInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  slug: z.string().min(2).max(120).optional(),
  category: z.string().min(2).max(80),
  excerpt: z.string().min(10).max(500),
  content: z.string().min(20).max(30000),
  youtube_url: z.string().url().optional().or(z.literal("")),
  youtube_search_query: z.string().max(300).optional().or(z.literal("")),
  cover_emoji: z.string().max(8).optional().or(z.literal("")),
  references: z.array(z.string().url()).max(30).default([]),
  published: z.boolean().default(true),
});

export const upsertBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BlogInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      title: data.title,
      slug: data.slug?.trim() ? slugify(data.slug) : slugify(data.title),
      category: data.category,
      excerpt: data.excerpt,
      content: data.content,
      youtube_url: data.youtube_url || null,
      youtube_search_query: data.youtube_search_query || null,
      cover_emoji: data.cover_emoji || "🧘",
      references_json: data.references,
      author_id: context.userId,
      published: data.published,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("blogs")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
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
    await assertAdmin(context);
    const { error } = await context.supabase.from("blogs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- AI seed generator ----
const CATEGORIES = [
  "Musculoskeletal", "Neurological", "Sports", "Post-Surgical",
  "Pediatric", "Geriatric", "Cardiopulmonary", "Women's Health",
  "Manual Therapy", "Exercise & Rehab",
];

const SEED_TOPICS = [
  // 100 physiotherapy topics — real conditions, treatments, and advances
  "Low back pain: modern evidence-based physiotherapy",
  "Rotator cuff tendinopathy management",
  "Frozen shoulder (adhesive capsulitis) rehab",
  "Cervical radiculopathy: assessment and treatment",
  "Whiplash-associated disorders",
  "Tension-type headaches and physiotherapy",
  "Migraine and cervicogenic dysfunction",
  "Temporomandibular joint (TMJ) disorders",
  "Thoracic outlet syndrome",
  "Scapular dyskinesis",
  "Tennis elbow (lateral epicondylalgia)",
  "Golfer's elbow (medial epicondylalgia)",
  "Carpal tunnel syndrome conservative care",
  "De Quervain's tenosynovitis",
  "Trigger finger physiotherapy",
  "Osteoarthritis of the hip",
  "Osteoarthritis of the knee",
  "Patellofemoral pain syndrome",
  "Iliotibial band syndrome",
  "Hamstring strain rehabilitation",
  "Groin strain and adductor tendinopathy",
  "Achilles tendinopathy: heavy slow resistance",
  "Plantar fasciitis: evidence-based care",
  "Ankle sprain rehabilitation",
  "Chronic ankle instability",
  "Shin splints (medial tibial stress syndrome)",
  "Stress fractures: return to running",
  "ACL reconstruction rehabilitation",
  "Meniscal repair rehab timelines",
  "Total knee replacement recovery",
  "Total hip replacement recovery",
  "Shoulder replacement (arthroplasty) rehab",
  "Post-fracture upper limb rehab",
  "Post-fracture lower limb rehab",
  "Stroke rehabilitation: upper limb",
  "Stroke rehabilitation: gait training",
  "Parkinson's disease and LSVT BIG",
  "Multiple sclerosis: physiotherapy strategies",
  "Spinal cord injury rehab overview",
  "Traumatic brain injury: physical rehab",
  "Bell's palsy facial rehab",
  "Vestibular rehabilitation for BPPV",
  "Vestibular neuritis and balance retraining",
  "Cervicogenic dizziness",
  "Fall prevention in older adults",
  "Sarcopenia and resistance training",
  "Osteoporosis: safe exercise prescription",
  "Cerebral palsy in children: physiotherapy",
  "Torticollis in infants",
  "Developmental coordination disorder",
  "Ehlers-Danlos and hypermobility",
  "Fibromyalgia and graded exercise",
  "Chronic fatigue syndrome: pacing",
  "Chronic pain and pain neuroscience education",
  "Complex regional pain syndrome (CRPS)",
  "Post-COVID rehabilitation",
  "Long COVID and dysautonomia",
  "Cardiac rehabilitation phases",
  "Pulmonary rehab for COPD",
  "Asthma and breathing retraining",
  "Diaphragmatic breathing for anxiety",
  "Pelvic floor dysfunction in women",
  "Postnatal recovery and diastasis recti",
  "Prenatal exercise guidelines",
  "Male pelvic pain and prostatectomy rehab",
  "Urinary incontinence physiotherapy",
  "Lymphedema management post-mastectomy",
  "Amputee rehabilitation and prosthetics",
  "Burn scar management",
  "Dry needling: what the evidence shows",
  "Manual therapy: joint mobilization principles",
  "Myofascial release: fact vs fiction",
  "Instrument-assisted soft tissue mobilization",
  "Kinesiology taping evidence",
  "Blood flow restriction (BFR) training",
  "Isometric loading for tendinopathy",
  "Eccentric exercise for Achilles tendon",
  "Return-to-sport testing after ACL",
  "Concussion return-to-play protocol",
  "Runner's knee: assessment and load management",
  "Hip impingement (FAI) rehab",
  "Piriformis syndrome",
  "Sacroiliac joint dysfunction",
  "Spondylolisthesis and core stability",
  "Disc herniation: conservative management",
  "Spinal stenosis and flexion-based exercise",
  "Scoliosis: Schroth method overview",
  "Postural pain and ergonomics for desk workers",
  "Text neck: myth and reality",
  "Sleep posture and neck pain",
  "Running gait analysis basics",
  "Cycling fit and knee pain",
  "Swimmer's shoulder",
  "Overhead athlete's shoulder",
  "Youth athlete injury prevention",
  "Female athlete triad and RED-S",
  "Warm-up protocols that reduce injury",
  "Foam rolling: what it actually does",
  "Cryotherapy and heat therapy: when to use",
  "Electrotherapy modalities in physiotherapy",
  "Telehealth physiotherapy: best practices",
  "AI and wearables in modern physiotherapy",
];

const BlogGen = z.object({
  title: z.string(),
  slug: z.string(),
  category: z.string(),
  excerpt: z.string(),
  content: z.string(),
  cover_emoji: z.string(),
  youtube_search_query: z.string(),
  references_json: z.array(z.string()),
});

async function generateOne(apiKey: string, topic: string, category: string) {
  const gateway = createLovableAiGatewayProvider(apiKey);
  const { output } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    output: Output.object({ schema: BlogGen }),
    prompt: `Write an in-depth, evidence-based physiotherapy blog post for patients and clinicians.

Topic: "${topic}"
Category: ${category}

Return a JSON object with:
- title: catchy but clinical, <= 90 chars
- slug: kebab-case url slug, <= 70 chars
- category: exactly "${category}"
- excerpt: 1-2 sentence summary, <= 220 chars
- content: 700-1100 words in **markdown**. Structure with these ## H2 sections: "Overview", "Signs & Symptoms", "Causes & Risk Factors", "Physiotherapy Assessment", "Treatment Approach", "Exercises You Can Try", "Recent Advances", "When to See a Physiotherapist". Use bullet lists and **bold** where useful. Do NOT include the H1 title in content. Include a short medical disclaimer at the end.
- cover_emoji: single emoji that fits (e.g. 🦵 🧠 🏃 🦴 🫀)
- youtube_search_query: 3-8 word search phrase to find helpful videos on YouTube
- references_json: 3-5 authoritative real URLs (NHS, Mayo Clinic, PubMed, PMC, physiopedia.com, APTA, JOSPT, BJSM). Use real URLs that exist.

Do not invent journal DOIs. Keep tone professional, warm, and accurate.`,
  });
  return output;
}

export const seedBlogsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ count: z.number().int().min(1).max(10).default(5) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    // Get existing slugs / titles to skip
    const { data: existing } = await context.supabase.from("blogs").select("title");
    const existingTitles = new Set((existing ?? []).map((r: { title: string }) => r.title));

    const remaining = SEED_TOPICS.filter((t) => !existingTitles.has(pickTitle(t)));
    if (remaining.length === 0) {
      return { created: 0, total: existing?.length ?? 0, done: true };
    }

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
          excerpt: gen.excerpt,
          content: gen.content,
          cover_emoji: gen.cover_emoji || "🧘",
          youtube_search_query: gen.youtube_search_query,
          references_json: gen.references_json ?? [],
          author_id: context.userId,
          published: true,
        });
        if (error) errors.push(`${topic}: ${error.message}`);
        else created++;
      } catch (e) {
        errors.push(`${topic}: ${(e as Error).message}`);
      }
    }

    const { count } = await context.supabase
      .from("blogs")
      .select("*", { count: "exact", head: true });

    return {
      created,
      total: count ?? 0,
      done: remaining.length <= batch.length,
      errors,
    };
  });

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
function pickTitle(_t: string) { return _t; } // stub — kept for signature parity
