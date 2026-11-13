"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LOGIN_DOMAIN = "crm.causekind";

/** The CRM's own sign-in. A bare login ID gets the staff domain added. */
export function CrmLogin() {
  const { setUser } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = loginId.trim();
    if (!id || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await login(id.includes("@") ? id : `${id}@${LOGIN_DOMAIN}`, password, true);
      setUser({ email: res.email, role: res.role, fullName: res.fullName });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(/401|invalid|bad credentials/i.test(raw) || !raw ? "Wrong login ID or password." : raw);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex h-12 items-center bg-[#1e2a44] px-4 font-semibold text-white">CauseKind CRM</header>
      <main className="flex flex-1 items-center justify-center p-4">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold">Sign in to the CRM</h1>
            <p className="text-sm text-muted-foreground">Use the login ID and password your super admin gave you.</p>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            Login ID
            <Input autoComplete="username" autoFocus value={loginId} onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. priya" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Password
            <Input type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !loginId.trim() || !password}>
            {busy && <Loader2 className="size-4 animate-spin" />} Sign in
          </Button>
          <p className="text-xs text-muted-foreground">Forgot your password? Ask your super admin to reset it.</p>
        </form>
      </main>
    </div>
  );
}
