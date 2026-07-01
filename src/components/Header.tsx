import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/sthairya-logo.jpg.asset.json";
import { KeyRound, LogOut } from "lucide-react";

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
    <header className="border-b border-border/60 bg-background/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-md group-hover:bg-primary/25 transition" />
            <img
              src={logoAsset.url}
              alt="Sthairya Physiocare"
              className="relative w-11 h-11 rounded-full object-cover ring-2 ring-primary/30 shadow-md"
            />
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-serif text-base md:text-lg font-semibold tracking-tight text-primary truncate">
              Sthairya's <span className="text-accent">Physio Journal</span>
            </div>
            <div className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-muted-foreground -mt-0.5">
              Resilience · Firmness · Balance
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2 text-sm shrink-0">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-md hover:bg-muted transition text-foreground/80 hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-muted text-foreground font-medium" }}
          >
            Articles
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-md hover:bg-muted transition text-foreground/80 hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground font-medium" }}
              >
                Admin
              </Link>
              <Link
                to="/admin/password"
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground text-xs"
                title="Change password"
              >
                <KeyRound className="w-3.5 h-3.5" /> Password
              </Link>
            </>
          )}
          {email ? (
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition text-xs"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition font-medium"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
