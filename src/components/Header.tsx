import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/sthairya-logo.jpg.asset.json";
import { KeyRound, LogOut, Home, Users, Settings, PenTool } from "lucide-react";

export function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [homeUrl, setHomeUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user.email ?? null);
      if (data.session?.user) await checkRoles(data.session.user.id);
    });
    supabase.from("site_settings").select("global_redirect_url").eq("id", 1).maybeSingle().then(({ data }) => {
      if (mounted) setHomeUrl(data?.global_redirect_url ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setEmail(session?.user.email ?? null);
      if (session?.user) await checkRoles(session.user.id);
      else { setIsAdmin(false); setIsEditor(false); }
    });
    async function checkRoles(uid: string) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roles = (data ?? []).map((r) => r.role);
      setIsAdmin(roles.includes("admin"));
      setIsEditor(roles.includes("editor"));
    }
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    try { sessionStorage.clear(); } catch { /* ignore */ }
    router.navigate({ to: "/", replace: true });
  }

  function goHome(e: React.MouseEvent) {
    if (homeUrl && /^https?:\/\//i.test(homeUrl)) {
      e.preventDefault();
      window.location.href = homeUrl;
    }
  }

  return (
    <header className="border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-5 md:px-8 h-16 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <img
            src={logoAsset.url}
            alt="Sthairya Physiocare"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-primary/30 shadow-sm shrink-0"
          />
          <span className="font-serif text-sm sm:text-base md:text-xl font-bold tracking-tight leading-tight logo-gradient-text">
            Sthairya's Physio Journal
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1 md:gap-2 text-sm shrink-0">
          <Link
            to="/"
            className="px-2 sm:px-3 py-1.5 rounded-md hover:bg-muted transition text-foreground/80 hover:text-foreground text-xs sm:text-sm"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-muted text-foreground font-medium" }}
          >
            Articles
          </Link>
          <a
            href={homeUrl && /^https?:\/\//i.test(homeUrl) ? homeUrl : "/"}
            onClick={goHome}
            className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md hover:bg-muted transition text-foreground/80 hover:text-foreground text-xs sm:text-sm"
            title="Return to Home"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Return to Home</span>
            <span className="sm:hidden">Home</span>
          </a>
          {(isAdmin || isEditor) && (
            <>
              <Link
                to="/admin"
                className="px-2 sm:px-3 py-1.5 rounded-md hover:bg-muted transition text-foreground/80 hover:text-foreground text-xs sm:text-sm"
                activeProps={{ className: "bg-muted text-foreground font-medium" }}
              >
                {isAdmin ? "Admin" : "My articles"}
              </Link>
              {isAdmin && (
                <>
                  <Link to="/admin/users" className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground text-xs" title="Users">
                    <Users className="w-3.5 h-3.5" /> Users
                  </Link>
                  <Link to="/admin/settings" className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground text-xs" title="Settings">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </Link>
                </>
              )}
              <Link
                to="/admin/password"
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground text-xs"
                title="Change password"
              >
                <KeyRound className="w-3.5 h-3.5" /> Password
              </Link>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          )}
          {!email && (
            <Link
              to="/auth"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition shrink-0"
              title="Author Dashboard"
              aria-label="Author Dashboard"
            >
              <PenTool className="w-4 h-4" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
