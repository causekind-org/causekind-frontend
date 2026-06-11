"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMyProfile, updateLocation, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Navigation, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    getMyProfile()
      .then(setProfile)
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user, router]);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support geolocation");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await updateLocation(pos.coords.latitude, pos.coords.longitude);
          setProfile(updated);
          toast.success("Location saved successfully!");
        } catch {
          toast.error("Failed to save location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please allow location access in your browser settings.");
        } else {
          toast.error("Could not get your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">My Profile</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : profile && (
        <div className="space-y-4">
          {/* Basic info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Account details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{profile.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{profile.phone}</span>
              </div>
              {profile.city && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City</span>
                  <span className="font-medium">{profile.city}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium capitalize">{profile.role.toLowerCase()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.latitude && profile.longitude ? (
                <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-3 text-sm dark:bg-green-950/30">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Location set</p>
                    <p className="text-green-600/80 dark:text-green-500/80">
                      {profile.latitude.toFixed(5)}, {profile.longitude.toFixed(5)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm dark:border-orange-900 dark:bg-orange-950/30">
                  <p className="font-medium text-orange-700 dark:text-orange-400">Location not set</p>
                  <p className="mt-0.5 text-orange-600/80 dark:text-orange-500/80">
                    You need to set your location to donate or request items within 10 km.
                  </p>
                </div>
              )}

              <Button onClick={handleUseMyLocation} disabled={locating} className="w-full" variant={profile.latitude ? "outline" : "default"}>
                {locating
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Detecting location…</>
                  : <><Navigation className="mr-2 h-4 w-4" /> {profile.latitude ? "Update my location" : "Use my current location"}</>
                }
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Your device will ask for permission. Coordinates are used only to verify 10 km proximity.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
