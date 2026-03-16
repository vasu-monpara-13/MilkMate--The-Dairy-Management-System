// src/pages/customer/CustomerSettingsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  User,
  Mail,
  Phone,
  Shield,
  LogOut,
  Save,
  KeyRound,
  Trash2,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  role: string | null;
};

function initials(nameOrEmail: string) {
  const t = (nameOrEmail || "").trim();
  if (!t) return "U";
  const parts = t.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

export default function CustomerSettingsPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const emailLabel = useMemo(
    () => profile?.email ?? user?.email ?? "—",
    [profile?.email, user?.email]
  );

  const roleLabel = useMemo(
    () => (profile?.role ?? "customer").toLowerCase(),
    [profile?.role]
  );

  const avatarText = useMemo(
    () => initials(fullName || String(emailLabel)),
    [fullName, emailLabel]
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!user?.id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, mobile_number, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        toast.error("Failed to load profile", { description: error.message });
        setProfile(null);
      } else {
        const p = (data as ProfileRow | null) ?? null;
        setProfile(p);
        setFullName(p?.full_name ?? "");
        setMobile(p?.mobile_number ?? "");
      }

      setLoading(false);
    };

    run();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const onSaveProfile = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          mobile_number: mobile.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Saved", {
        description: "Your profile settings were updated.",
      });
    } catch (e: any) {
      toast.error("Update failed", {
        description: e?.message ?? "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error("Enter a new password");
      return;
    }

    if (newPassword.trim().length < 6) {
      toast.error("Password too short", {
        description: "Minimum 6 characters.",
      });
      return;
    }

    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) throw error;

      setNewPassword("");
      toast.success("Password updated");
    } catch (e: any) {
      toast.error("Password update failed", {
        description: e?.message ?? "Try again",
      });
    } finally {
      setPwSaving(false);
    }
  };

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out");
      nav("/login");
    } catch (e: any) {
      toast.error("Logout failed", {
        description: e?.message ?? "Try again",
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#edf5ff_0%,#f7f9ff_45%,#eef4ff_100%)] p-4 md:p-6 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#101a2c_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-4rem] h-[18rem] w-[18rem] rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute top-10 right-[-5rem] h-[20rem] w-[20rem] rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute bottom-[-8rem] left-[30%] h-[18rem] w-[18rem] rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/10" />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-5">
        {/* compact top row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-semibold text-sky-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/75 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              Account Workspace
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Settings
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your profile, security and account preferences.
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/75"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* account snapshot */}
        <Card className="overflow-hidden rounded-[30px] border-slate-200/70 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <CardContent className="p-5 md:p-6">
            {loading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44 rounded-lg" />
                  <Skeleton className="h-3 w-28 rounded-lg" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-xl font-black text-white shadow-lg">
                    {avatarText}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-lg font-black text-slate-900 dark:text-slate-100">
                        {fullName || "Customer"}
                      </p>
                      <Badge className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                        {roleLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {emailLabel}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[58%]">
                  <InfoPill icon={Mail} label="Email" value={emailLabel} />
                  <InfoPill icon={Phone} label="Mobile" value={mobile || "Not added"} />
                  <InfoPill icon={Shield} label="Role" value={roleLabel} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* profile card */}
          <Card className="xl:col-span-7 overflow-hidden rounded-[30px] border-slate-200/70 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
            <CardHeader className="border-b border-slate-200/70 dark:border-slate-700/70">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <User className="h-4 w-4 text-slate-500" />
                Profile Details
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 md:p-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-11 w-full rounded-2xl" />
                  <Skeleton className="h-11 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl md:col-span-2" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mobile number</Label>
                      <Input
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="Your phone"
                        className="h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70"
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {emailLabel}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Shield className="h-4 w-4" />
                      Account Role
                    </div>
                    <div className="mt-1 font-semibold capitalize text-slate-900 dark:text-slate-100">
                      {roleLabel}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={onSaveProfile}
                      disabled={saving}
                      className="rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 shadow-md"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* security + danger */}
          <div className="xl:col-span-5 space-y-5">
            <Card className="overflow-hidden rounded-[30px] border-slate-200/70 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
              <CardHeader className="border-b border-slate-200/70 dark:border-slate-700/70">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  Security
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 md:p-6 space-y-5">
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70"
                  />
                </div>

                <Button
                  variant="secondary"
                  className="w-full rounded-2xl"
                  onClick={onChangePassword}
                  disabled={pwSaving}
                >
                  {pwSaving ? "Updating..." : "Change password"}
                </Button>

                <Separator />

                <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Password Tips
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Use at least 6 characters. Re-login if update fails.
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border-red-200/70 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-red-900/40 dark:bg-slate-900/75 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
              <CardHeader className="border-b border-red-200/60 dark:border-red-900/30">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-red-600 dark:text-red-400">
                  <Trash2 className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 md:p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Account deletion will be added later with admin approval and billing checks.
                </p>

                <Button
                  variant="destructive"
                  className="w-full rounded-2xl"
                  onClick={() => toast.message("Not enabled yet")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}