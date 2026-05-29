"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { register } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HandCoins, HeartHandshake } from "lucide-react";

export default function RegisterPage() {
  const { setAuth, user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    role: "DONOR" as "DONOR" | "DONEE",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user) return null;

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await register(form);
      setAuth(token);
      toast.success("Account created!");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <Card>
        <CardHeader>
          <CardTitle>Create your CauseKind account</CardTitle>
          <CardDescription>Pick how you want to use CauseKind.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selector */}
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "DONOR" as const, icon: HeartHandshake, title: "I want to donate", desc: "Give money to verified campaigns." },
                { value: "DONEE" as const, icon: HandCoins, title: "I need support", desc: "Create verified campaigns and raise funds." },
              ].map((opt) => {
                const active = form.role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("role", opt.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40"
                    }`}
                  >
                    <opt.icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="mt-2 font-semibold text-sm">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" placeholder="Riya Sharma" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" value={form.password} onChange={(e) => set("password", e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : `Create account as ${form.role === "DONOR" ? "Donor" : "Donee"}`}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have one?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
