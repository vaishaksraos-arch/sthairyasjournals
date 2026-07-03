import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { useAdminGate } from "@/hooks/use-admin-gate";
import { provisionUser, resetUserPassword, updateUserAccount } from "@/lib/blogs.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, KeyRound, Users as UsersIcon, Pencil } from "lucide-react";

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

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [qualification, setQualification] = useState("");
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const [saving, setSaving] = useState(false);

  const [resetUid, setResetUid] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);

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
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await provision({ data: { full_name: fullName, username, email, password, qualification, role, photo_url: "" } });
      toast.success("User provisioned");
      setFullName(""); setUsername(""); setEmail(""); setPassword(""); setQualification(""); setRole("editor");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      refetch();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUid) return;
    if (newPw.length < 8) return toast.error("Password must be at least 8 characters");
    setResetting(true);
    try {
      await reset({ data: { user_id: resetUid, password: newPw } });
      toast.success("Password reset");
      setResetUid(null); setNewPw("");
    } catch (err) { toast.error((err as Error).message); }
    finally { setResetting(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <BackButton fallback="/admin" label="Back" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><UsersIcon className="w-5 h-5" /></div>
          <h1 className="font-serif text-3xl text-primary">Users</h1>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-accent" /> Provision new user</h2>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4" autoComplete="off">
            <F label="Full name"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={ip} /></F>
            <F label="Username"><input required value={username} onChange={(e) => setUsername(e.target.value)} className={ip} /></F>
            <F label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={ip} /></F>
            <F label="Password (min 8)"><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={ip} /></F>
            <F label="Qualification"><input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="BPT, MPT" className={ip} /></F>
            <F label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as "editor" | "admin")} className={ip}>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </F>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-serif text-xl mb-4">All users</h2>
          <div className="divide-y divide-border">
            {(users ?? []).map((u) => (
              <div key={u.id} className="py-3 flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.full_name || u.display_name || u.username || u.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.username && <>@{u.username} · </>}
                    {u.qualification || "—"} · <span className="text-accent">{u.roles.join(", ") || "user"}</span>
                  </div>
                </div>
                <button onClick={() => setEditUser(u)} className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border hover:bg-muted text-xs">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setResetUid(u.id); setNewPw(""); }} className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border hover:bg-muted text-xs">
                  <KeyRound className="w-3.5 h-3.5" /> Reset password
                </button>
              </div>
            ))}
            {!(users ?? []).length && <p className="text-sm text-muted-foreground py-4">No users yet.</p>}
          </div>
        </section>

        {resetUid && (
          <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setResetUid(null)}>
            <form onSubmit={submitReset} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl space-y-3">
              <h3 className="font-serif text-lg">Reset password</h3>
              <input type="password" required minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (min 8)" autoComplete="new-password" className={ip} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setResetUid(null)} className="h-10 px-4 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
                <button type="submit" disabled={resetting} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{resetting ? "Resetting…" : "Reset"}</button>
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
      </div>
    </div>
  );
}

const ip = "w-full h-10 px-3 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 text-sm";
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
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      // fallback: we can't read arbitrary emails from client; leave blank if unknown
      if (data.user?.id === user.id && data.user.email) setEmail(data.user.email);
    })();
  }, [user.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Email is required");
    if (pw && pw.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await update({ data: { user_id: user.id, full_name: fullName, username: uname, email, password: pw || undefined, qualification: qual } });
      toast.success("User updated");
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4" autoComplete="off">
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
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="Min 8 chars" className={ip} />
            </F>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
