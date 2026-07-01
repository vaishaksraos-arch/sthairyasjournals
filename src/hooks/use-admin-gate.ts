import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

type Status = "loading" | "unauth" | "not-admin" | "admin";

export function useAdminGate(): { status: Status; userId: string | null } {
  const [status, setStatus] = useState<Status>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function run() {
      const { data: session } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session.session) {
        setStatus("unauth");
        navigate({ to: "/auth" });
        return;
      }
      const uid = session.session.user.id;
      setUserId(uid);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!mounted) return;
      setStatus(data ? "admin" : "not-admin");
    }
    run();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return { status, userId };
}
