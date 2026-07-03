import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackButton({ fallback = "/admin", label = "Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  function go() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallback });
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted hover:border-accent/40 text-sm text-foreground/80 hover:text-foreground transition shadow-sm"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
