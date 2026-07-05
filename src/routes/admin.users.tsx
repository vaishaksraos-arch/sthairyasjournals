import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { provisionUser, resetUserPassword, updateUserAccount, deleteUserAccount } from "@/lib/blogs.functions";
import { SecurePasswordInput, type SecurePasswordHandle } from "@/components/SecurePasswordInput";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserPlus, KeyRound, Users as UsersIcon, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Sthairya's Physio Journal" }] }),
  component: UsersPage,
});

type ProfileRow = { id: string; full_name: string | null; display_name: string | null; username: string | null; qualification: string | null; };
type UserRow = ProfileRow & { roles: string[] };

function UsersPage() {
  const { status } = useAdminGate();
  const qc = useQueryClient();
  const provision = useServerFn(provisionUser);
  const reset = useServerFn(resetUserPassword);
  const updateAcct = useServerFn(updateUserAccount);
  const deleteAcct = useServerFn(deleteUserAccount);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const provisionPwRef = useRef<SecurePasswordHandle>(null);
  const [qualification, setQualification] = useState("");
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const [saving, setSaving] = useState(false);

  const [resetUid, setResetUid] = useState<string | null>(null);
  const resetPwRef = useRef<SecurePasswordHandle>(null);
  const [resetting, setResetting] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: users, refetch } = useQuery({
    queryKey: ["admin-users"],
    enabled: status === "admin",
    queryFn: async () => {
      const { data: profs, error } = await supabase.from("profiles").select("id,full_name,display_name,username,qualification");
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      return (profs as ProfileRow[]).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })) as UserRow[];
    },
  });

  if (status !== "admin") {
    return <div className="min-h-screen bg-background"><Header /><div className="max-w-md mx-auto p-10 text-center text-muted-foreground">Loading…</div></div>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const password = provisionPwRef.current?.getValue() ?? "";
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await provision({ data: { full_name: fullName, username, email, password, qualification, role, photo_url: "" } });
      toast.success("User provisioned");
      setFullName(""); setUsername(""); setEmail(""); setQualification(""); setRole("editor");
      provisionPwRef.current?.clear();
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      refetch();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUid) return;
    const newPw = resetPwRef.current?.getValue() ?? "";
    if (newPw.length < 8) return toast.error("Password must be at least 8 characters");
    setResetting(true);
    try {
      await reset({ data: { user_id: resetUid, password: newPw } });
      toast.success("Password reset");
      resetPwRef.current?.clear();
      setResetUid(null);
    } catch (err) { toast.error((err as Error).message); }
    finally { setResetting(false); }
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await deleteAcct({ data: { user_id: deleteUser.id } });
      toast.success("User deleted");
      setDeleteUser(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      refetch();
    } catch (err) { toast.error((err as Error).message); }
    finally { setDeleting(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <BackButton fallback="/admin" label="Back" />
        </div>
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary grid place-items-center shadow-sm"><UsersIcon className="w-5 h-5" /></div>
          <h1 className="font-serif text-3xl text-primary">Users</h1>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5 hover:shadow-primary/10 transition-shadow">
          <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-accent" /> Provision new user</h2>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4" autoComplete="off">
            <F label="Full name"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={ip} /></F>
            <F label="Username"><input required value={username} onChange={(e) => setUsername(e.target.value)} className={ip} /></F>
            <F label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={ip} /></F>
            <F label="Password (min 8)"><SecurePasswordInput ref={provisionPwRef} required minLength={8} className={ip} /></F>
            <F label="Qualification"><input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="BPT, MPT" className={ip} /></F>
            <F label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as "editor" | "admin")} className={ip}>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </F>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving} className="h-10 px-5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-95 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.99]">
                {saving ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5">
          <h2 className="font-serif text-xl mb-4">All users</h2>
          <div className="divide-y divide-border">
            {(users ?? []).map((u) => (
              <div key={u.id} className="py-3 flex flex-wrap items-center gap-2 hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.full_name || u.display_name || u.username || u.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.username && <>@{u.username} · </>}
                    {u.qualification || "—"} · <span className="text-accent font-medium">{u.roles.join(", ") || "user"}</span>
                  </div>
                </div>
                <button onClick={() => setEditUser(u)} className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border hover:bg-muted hover:border-primary/40 text-xs transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setResetUid(u.id)} className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border hover:bg-muted hover:border-primary/40 text-xs transition-colors">
                  <KeyRound className="w-3.5 h-3.5" /> Reset password
                </button>
                <button onClick={() => setDeleteUser(u)} className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            ))}
            {!(users ?? []).length && <p className="text-sm text-muted-foreground py-4">No users yet.</p>}
          </div>
        </section>

        {resetUid && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200" onClick={() => setResetUid(null)}>
            <form onSubmit={submitReset} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-3 animate-in zoom-in-95 duration-200" autoComplete="off">
              <h3 className="font-serif text-lg">Reset password</h3>
              <SecurePasswordInput ref={resetPwRef} required minLength={8} placeholder="New password (min 8)" className={ip} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setResetUid(null)} className="h-10 px-4 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
                <button type="submit" disabled={resetting} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-95 transition">{resetting ? "Resetting…" : "Reset"}</button>
              </div>
            </form>
          </div>
        )}

        {editUser && (
          <EditUserPanel
            user={editUser}
            onClose={() => setEditUser(null)}
            onSaved={() => { setEditUser(null); qc.invalidateQueries({ queryKey: ["admin-users"] }); refetch(); }}
            update={updateAcct}
          />
        )}

        {deleteUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200" onClick={() => setDeleteUser(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg">Delete user</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently remove <strong>{deleteUser.full_name || deleteUser.username || deleteUser.id.slice(0, 8)}</strong>? This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteUser(null)} className="h-10 px-4 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
                <button type="button" onClick={confirmDelete} disabled={deleting} className="h-10 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50 hover:opacity-95 transition">
                  {deleting ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ip = "w-full h-10 px-3 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-sm transition";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>{children}</label>;
}

function EditUserPanel({
  user, onClose, onSaved, update,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
  update: (opts: { data: { user_id: string; full_name: string; username: string; email: string; password?: string; qualification?: string } }) => Promise<unknown>;
}) {
  const [fullName, setFullName] = useState(user.full_name || user.display_name || "");
  const [uname, setUname] = useState(user.username || "");
  const [email, setEmail] = useState("");
  const [qual, setQual] = useState(user.qualification || "");
  const pwRef = useRef<SecurePasswordHandle>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id === user.id && data.user.email) setEmail(data.user.email);
    })();
  }, [user.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Email is required");
    const pw = pwRef.current?.getValue() ?? "";
    if (pw && pw.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await update({ data: { user_id: user.id, full_name: fullName, username: uname, email, password: pw || undefined, qualification: qual } });
      toast.success("User updated");
      pwRef.current?.clear();
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200" autoComplete="off">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-accent" />
          <h3 className="font-serif text-lg">Edit user</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="Full name"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={ip} /></F>
          <F label="Username"><input required value={uname} onChange={(e) => setUname(e.target.value)} className={ip} /></F>
          <F label="Email ID"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={ip} /></F>
          <F label="Qualification"><input value={qual} onChange={(e) => setQual(e.target.value)} className={ip} /></F>
          <div className="sm:col-span-2">
            <F label="New password (leave blank to keep current)">
              <SecurePasswordInput ref={pwRef} placeholder="Min 8 chars" className={ip} />
            </F>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-95 transition">{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
