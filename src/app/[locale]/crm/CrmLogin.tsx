"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@/styles/staff-console.css";

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
    <div className="ck-staff flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center gap-3 text-white">
        <span aria-hidden className="flex size-10 items-center justify-center rounded-[14px] border border-white/20 bg-white/10 text-[15px] font-bold">CK</span>
        <span>
          <span className="block text-[15px] font-bold leading-tight">CauseKind</span>
          <span className="block text-[11.5px] leading-tight text-white/70">CRM</span>
        </span>
      </div>
      <div className="w-full max-w-sm">
        <form onSubmit={submit} className="ck-glass-solid w-full space-y-4 p-6 sm:p-7">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em]">Sign in to the CRM</h1>
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
          <Button type="submit" className="h-10 w-full rounded-full" disabled={busy || !loginId.trim() || !password}>
            {busy && <Loader2 className="size-4 animate-spin" />} Sign in
          </Button>
          <p className="text-xs text-muted-foreground">Forgot your password? Ask your super admin to reset it.</p>
        </form>
      </div>
    </div>
  );
}
