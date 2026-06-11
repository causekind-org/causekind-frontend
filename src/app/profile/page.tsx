"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getProfile, updateProfile, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Phone, MapPin, Mail, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    getProfile()
      .then((p) => {
        setProfile(p);
        setFullName(p.fullName);
        setPhone(p.phone);
        setCity(p.city);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load profile details");
      })
      .finally(() => setLoading(false));
  }, [user, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !city.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      });
      setProfile(updated);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="size-8 animate-spin text-[#b04a15]" />
      </div>
    );
  }

  return (
    <div className="bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-[calc(100vh-3.5rem)] py-12 px-6 sm:px-10 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Profile Card */}
        <Card className="rounded-2xl border-2 border-orange-200 dark:border-stone-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden">
          <CardHeader className="border-b border-orange-100 dark:border-stone-800 bg-gradient-to-r from-orange-50/50 to-transparent p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white flex items-center justify-center shadow-md shadow-orange-900/18 shrink-0">
                <User className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">My Profile</CardTitle>
                <CardDescription className="text-stone-500 dark:text-stone-400">View and update your personal details</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-stone-400">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="fullName"
                    className="pl-10 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 text-stone-800 dark:text-stone-100"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email (Disabled) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-stone-400">Email Address</Label>
                  <span className="text-[10px] font-black text-stone-400 uppercase flex items-center gap-1"><Shield className="w-3 h-3 text-[#b04a15]" /> System ID</span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="email"
                    className="pl-10 rounded-xl border-stone-200 dark:border-stone-850 py-5 font-medium bg-stone-50 dark:bg-zinc-950 text-stone-400 cursor-not-allowed"
                    value={profile?.email || ""}
                    disabled
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-stone-400">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="phone"
                    className="pl-10 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 text-stone-800 dark:text-stone-100"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-stone-400">City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="city"
                    className="pl-10 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 text-stone-800 dark:text-stone-100"
                    placeholder="Enter your city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="btn-3d btn-shine w-full bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl py-6 font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    "Save Profile Changes"
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
