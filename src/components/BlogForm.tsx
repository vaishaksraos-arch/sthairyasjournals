import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, X, User } from "lucide-react";
import { ImageCropperModal } from "@/components/ImageCropperModal";

export type BlogFormValues = {
  id?: string;
  title: string;
  slug: string;
  category: string;
  body_part: string;
  excerpt: string;
  content: string;
  youtube_url: string;
  youtube_search_query: string;
  cover_emoji: string;
  cover_image_url: string;
  author_name: string;
  author_qualification: string;
  author_photo_url: string;
  author_id_override?: string;
  references: string[];
  published: boolean;
  show_assessment: boolean;
  show_treatment: boolean;
  show_exercises: boolean;
};

const DEFAULTS: BlogFormValues = {
  title: "", slug: "", category: "Musculoskeletal", body_part: "",
  excerpt: "", content: "## Overview\n\n",
  youtube_url: "", youtube_search_query: "",
  cover_emoji: "🧘", cover_image_url: "",
  author_name: "", author_qualification: "", author_photo_url: "",
  references: [], published: true,
  show_assessment: false, show_treatment: false, show_exercises: false,
};

const CATEGORIES = ["Musculoskeletal","Neurological","Sports","Post-Surgical","Pediatric","Geriatric","Cardiopulmonary","Women's Health","Manual Therapy","Exercise & Rehab"];
const BODY_PARTS = ["","Shoulder","Elbow","Wrist/Hand","Neck","Upper Back","Lower Back","Hip","Knee","Ankle/Foot","Head/Face","Chest","Pelvis","Full Body"];

async function readAsDataUrl(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error("File size exceeds 2 MB limit");
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

type CropTarget = "cover" | "photo";

export function BlogForm({
  initial,
  onSubmit,
  isAdmin = false,
  users = [],
}: {
  initial?: Partial<BlogFormValues>;
  onSubmit: (values: BlogFormValues) => Promise<void> | void;
  isAdmin?: boolean;
  users?: Array<{ id: string; label: string }>;
}) {
  const [v, setV] = useState<BlogFormValues>({ ...DEFAULTS, ...initial });
  const [refInput, setRefInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

  function up<K extends keyof BlogFormValues>(k: K, val: BlogFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(v); } finally { setSaving(false); }
  }

  async function beginCrop(file: File, target: CropTarget, resetRef: React.RefObject<HTMLInputElement | null>) {
    try {
      const url = await readAsDataUrl(file);
      setCropSrc(url);
      setCropTarget(target);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      if (resetRef.current) resetRef.current.value = "";
    }
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try { await beginCrop(file, "cover", coverFileRef); }
    finally { setUploadingCover(false); }
  }

  async function onPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try { await beginCrop(file, "photo", photoFileRef); }
    finally { setUploadingPhoto(false); }
  }

  function handleCropped(url: string) {
    if (cropTarget === "cover") { up("cover_image_url", url); toast.success("Cover updated"); }
    else if (cropTarget === "photo") { up("author_photo_url", url); toast.success("Author photo updated"); }
    setCropSrc(null); setCropTarget(null);
  }

  function addRef() {
    const url = refInput.trim();
    if (!url) return;
    try { new URL(url); } catch { toast.error("Invalid URL"); return; }
    up("references", [...v.references, url]);
    setRefInput("");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Cover */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cover</div>
        <div className="grid md:grid-cols-[120px_1fr] gap-4 items-start">
          <div className="w-28 h-28 rounded-xl border border-border bg-muted grid place-items-center overflow-hidden">
            {v.cover_image_url ? (
              <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">{v.cover_emoji || "🧘"}</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Cover emoji</div>
              <input value={v.cover_emoji} onChange={(e) => up("cover_emoji", e.target.value)} className={inputCls + " text-center text-xl w-24"} />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={coverFileRef} type="file" accept="image/*" onChange={onCoverFile} className="hidden" />
              <button type="button" onClick={() => coverFileRef.current?.click()} disabled={uploadingCover} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-muted text-sm disabled:opacity-50">
                <Upload className="w-4 h-4" /> {uploadingCover ? "Uploading…" : v.cover_image_url ? "Replace image" : "Upload cover image"}
              </button>
              {v.cover_image_url && (
                <button type="button" onClick={() => up("cover_image_url", "")} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
              <span className="text-xs text-muted-foreground">Max 2 MB. Image overrides emoji.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Title">
          <input required value={v.title} onChange={(e) => up("title", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Slug (optional)">
          <input value={v.slug} onChange={(e) => up("slug", e.target.value)} placeholder="auto-generated" className={inputCls} />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Category">
          <select value={v.category} onChange={(e) => up("category", e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Body part">
          <select value={v.body_part} onChange={(e) => up("body_part", e.target.value)} className={inputCls}>
            {BODY_PARTS.map((b) => <option key={b} value={b}>{b || "— None —"}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Excerpt">
        <textarea required rows={2} value={v.excerpt} onChange={(e) => up("excerpt", e.target.value)} className={inputCls + " resize-y"} />
      </Field>

      {/* Section visibility toggles */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Section visibility (public)</div>
        <SectionToggle label="Enable Assessment Section Visibility" hint="Physiotherapy Assessment" checked={v.show_assessment} onChange={(x) => up("show_assessment", x)} />
        <SectionToggle label="Enable Treatment Approach Visibility" hint="Treatment Approach" checked={v.show_treatment} onChange={(x) => up("show_treatment", x)} />
        <SectionToggle label="Enable Exercises Section Visibility" hint="Exercises You Can Try" checked={v.show_exercises} onChange={(x) => up("show_exercises", x)} />
      </div>

      <Field label="Content (Markdown)">
        <textarea required rows={16} value={v.content} onChange={(e) => up("content", e.target.value)} className={inputCls + " font-mono text-sm resize-y"} />
      </Field>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="YouTube URL (optional)">
          <input value={v.youtube_url} onChange={(e) => up("youtube_url", e.target.value)} placeholder="https://youtube.com/watch?v=…" className={inputCls} />
        </Field>
        <Field label="YouTube search fallback">
          <input value={v.youtube_search_query} onChange={(e) => up("youtube_search_query", e.target.value)} placeholder="e.g. rotator cuff rehab" className={inputCls} />
        </Field>
      </div>

      {/* Author fields */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Author</div>
        <div className="grid md:grid-cols-[80px_1fr] gap-4 items-start">
          <div className="w-20 h-20 rounded-full border border-border bg-muted grid place-items-center overflow-hidden">
            {v.author_photo_url ? <img src={v.author_photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-muted-foreground" />}
          </div>
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Author name">
                <input value={v.author_name} onChange={(e) => up("author_name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Qualification">
                <input value={v.author_qualification} onChange={(e) => up("author_qualification", e.target.value)} placeholder="BPT, MPT, Physiotherapist" className={inputCls} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={photoFileRef} type="file" accept="image/*" onChange={onPhotoFile} className="hidden" />
              <button type="button" onClick={() => photoFileRef.current?.click()} disabled={uploadingPhoto} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border hover:bg-muted text-sm disabled:opacity-50">
                <Upload className="w-4 h-4" /> {uploadingPhoto ? "Uploading…" : v.author_photo_url ? "Replace photo" : "Upload photo"}
              </button>
              {v.author_photo_url && (
                <button type="button" onClick={() => up("author_photo_url", "")} className="text-xs text-destructive hover:underline">Remove</button>
              )}
              <span className="text-xs text-muted-foreground">Max 2 MB.</span>
            </div>
            {isAdmin && users.length > 0 && (
              <Field label="Assign article to user (admin)">
                <select value={v.author_id_override ?? ""} onChange={(e) => up("author_id_override", e.target.value || undefined)} className={inputCls}>
                  <option value="">— Keep current author —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </Field>
            )}
          </div>
        </div>
      </div>

      <Field label="Reference URLs">
        <div className="flex gap-2">
          <input value={refInput} onChange={(e) => setRefInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRef(); } }}
            placeholder="https://…" className={inputCls + " flex-1"} />
          <button type="button" onClick={addRef} className="px-3 rounded-lg border border-border hover:bg-muted">Add</button>
        </div>
        {v.references.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {v.references.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{r}</span>
                <button type="button" onClick={() => up("references", v.references.filter((_, j) => j !== i))} className="text-xs text-destructive hover:underline">remove</button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.published} onChange={(e) => up("published", e.target.checked)} className="w-4 h-4" />
        Published (unpublished = masked from public)
      </label>

      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <button type="submit" disabled={saving} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : v.id ? "Save changes" : "Publish"}
        </button>
      </div>
    </form>
  );
}

const inputCls = "w-full h-10 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function SectionToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button type="button" onClick={() => onChange(!checked)}
        className={`shrink-0 mt-0.5 w-10 h-6 rounded-full border transition relative ${checked ? "bg-accent border-accent" : "bg-muted border-border"}`}
        aria-pressed={checked} aria-label={label}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">Controls the "{hint}" H2 block on the public article.</div>
      </div>
    </label>
  );
}
