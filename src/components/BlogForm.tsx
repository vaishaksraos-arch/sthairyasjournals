import { useState } from "react";

export type BlogFormValues = {
  id?: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  youtube_url: string;
  youtube_search_query: string;
  cover_emoji: string;
  references: string[];
  published: boolean;
};

const DEFAULTS: BlogFormValues = {
  title: "",
  slug: "",
  category: "Musculoskeletal",
  excerpt: "",
  content: "## Overview\n\n",
  youtube_url: "",
  youtube_search_query: "",
  cover_emoji: "🧘",
  references: [],
  published: true,
};

const CATEGORIES = [
  "Musculoskeletal", "Neurological", "Sports", "Post-Surgical",
  "Pediatric", "Geriatric", "Cardiopulmonary", "Women's Health",
  "Manual Therapy", "Exercise & Rehab",
];

export function BlogForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<BlogFormValues>;
  onSubmit: (values: BlogFormValues) => Promise<void> | void;
}) {
  const [v, setV] = useState<BlogFormValues>({ ...DEFAULTS, ...initial });
  const [refInput, setRefInput] = useState("");
  const [saving, setSaving] = useState(false);

  function up<K extends keyof BlogFormValues>(k: K, val: BlogFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(v);
    } finally {
      setSaving(false);
    }
  }

  function addRef() {
    const url = refInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      return;
    }
    up("references", [...v.references, url]);
    setRefInput("");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid md:grid-cols-[1fr_140px] gap-4">
        <Field label="Title">
          <input
            required
            value={v.title}
            onChange={(e) => up("title", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Cover emoji">
          <input
            value={v.cover_emoji}
            onChange={(e) => up("cover_emoji", e.target.value)}
            className={inputCls + " text-center text-xl"}
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Slug (optional)">
          <input
            value={v.slug}
            onChange={(e) => up("slug", e.target.value)}
            placeholder="auto-generated"
            className={inputCls}
          />
        </Field>
        <Field label="Category">
          <select
            value={v.category}
            onChange={(e) => up("category", e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Excerpt">
        <textarea
          required
          rows={2}
          value={v.excerpt}
          onChange={(e) => up("excerpt", e.target.value)}
          className={inputCls + " resize-y"}
        />
      </Field>

      <Field label="Content (Markdown)">
        <textarea
          required
          rows={16}
          value={v.content}
          onChange={(e) => up("content", e.target.value)}
          className={inputCls + " font-mono text-sm resize-y"}
        />
      </Field>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="YouTube URL (optional)">
          <input
            value={v.youtube_url}
            onChange={(e) => up("youtube_url", e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className={inputCls}
          />
        </Field>
        <Field label="YouTube search fallback">
          <input
            value={v.youtube_search_query}
            onChange={(e) => up("youtube_search_query", e.target.value)}
            placeholder="e.g. rotator cuff rehab exercises"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Reference URLs">
        <div className="flex gap-2">
          <input
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addRef(); }
            }}
            placeholder="https://…"
            className={inputCls + " flex-1"}
          />
          <button type="button" onClick={addRef} className="px-3 rounded-lg border border-border hover:bg-muted">
            Add
          </button>
        </div>
        {v.references.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {v.references.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{r}</span>
                <button
                  type="button"
                  onClick={() => up("references", v.references.filter((_, j) => j !== i))}
                  className="text-xs text-destructive hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.published}
          onChange={(e) => up("published", e.target.checked)}
          className="w-4 h-4"
        />
        Published
      </label>

      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={saving}
          className="h-10 px-5 rounded-lg bg-surface text-surface-foreground font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : v.id ? "Save changes" : "Publish"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-lg border border-border bg-background outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
