import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "editor" | "user" | null;
export type RoleStatus = "loading" | "unauth" | "authed";

export function useRole(): { status: RoleStatus; role: Role; userId: string | null; isAdmin: boolean; isEditor: boolean } {
  const [status, setStatus] = useState<RoleStatus>("loading");
  const [role, setRole] = useState<Role>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load(uid: string | null) {
      if (!uid) {
        if (mounted) { setStatus("unauth"); setRole(null); setUserId(null); }
        return;
      }
      setUserId(uid);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (!mounted) return;
      const roles = (data ?? []).map((r) => r.role);
      setRole(roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : "user");
      setStatus("authed");
    }
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => load(s?.user.id ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { status, role, userId, isAdmin: role === "admin", isEditor: role === "editor" };
}
