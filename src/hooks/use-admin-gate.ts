// Back-compat wrapper. Prefer useRole() directly.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useRole } from "./use-role";

type Status = "loading" | "unauth" | "not-admin" | "admin";

export function useAdminGate(opts?: { allowEditor?: boolean }): { status: Status; userId: string | null; isEditor: boolean } {
  const { status, role, userId, isAdmin, isEditor } = useRole();
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "unauth") navigate({ to: "/auth" });
  }, [status, navigate]);

  const allowed = isAdmin || (opts?.allowEditor && isEditor);
  const outStatus: Status =
    status === "loading" ? "loading" :
    status === "unauth" ? "unauth" :
    allowed ? "admin" : "not-admin";
  return { status: outStatus, userId, isEditor };
}

export { useRole };
