import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/sthairya-logo.jpg.asset.json";

export function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user.email ?? null);
      if (data.session?.user) await checkAdmin(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setEmail(session?.user.email ?? null);
      if (session?.user) await checkAdmin(session.user.id);
      else setIsAdmin(false);
    });
    async function checkAdmin(uid: string) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    }
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logoAsset.url}
            alt="Sthairya Physiocare"
            className="w-10 h-10 rounded-full object-cover ring-1 ring-border shadow-sm"
          />
          <div className="leading-tight">
            <div className="font-serif text-base md:text-lg font-semibold tracking-tight text-surface">
              Sthairya's <span className="text-clay">Physio Journal</span>
            </div>
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-muted-foreground -mt-0.5">
              Resilience · Firmness · Balance
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 md:gap-4 text-sm">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-md hover:bg-muted transition"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-muted text-foreground" }}
          >
            Articles
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-md hover:bg-muted transition"
              activeProps={{ className: "bg-muted text-foreground" }}
            >
              Admin
            </Link>
          )}
          {email ? (
            <button
              onClick={signOut}
              className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition text-xs"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="px-3 py-1.5 rounded-md bg-surface text-surface-foreground hover:opacity-90 transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
