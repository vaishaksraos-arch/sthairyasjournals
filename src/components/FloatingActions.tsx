import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, MessageCircle } from "lucide-react";

export function FloatingActions() {
  const [fabUrl, setFabUrl] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("fab_redirect_url").eq("id", 1).maybeSingle().then(({ data }) => {
      setFabUrl(data?.fab_redirect_url ?? null);
    });
    function onScroll() { setShowTop(window.scrollY > 400); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const validFab = fabUrl && /^https?:\/\//i.test(fabUrl) ? fabUrl : null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 pointer-events-none">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
        className={`pointer-events-auto w-11 h-11 rounded-full bg-card border border-border shadow-lg grid place-items-center text-foreground hover:bg-muted transition-all duration-300 ${
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
      {validFab && (
        <a
          href={validFab}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact us"
          className="pointer-events-auto w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl grid place-items-center hover:scale-110 hover:shadow-primary/30 transition-transform"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}
    </div>
  );
}
