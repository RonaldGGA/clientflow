"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingsClientProps {
  isAdmin: boolean;
  businessName: string;
  userName: string;
  userEmail: string;
}

interface SaveState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

const INITIAL_SAVE: SaveState = { loading: false, success: false, error: null };

// ---------------------------------------------------------------------------
// Hook — save state
// ---------------------------------------------------------------------------

function useSaveState() {
  const [state, setState] = useState<SaveState>(INITIAL_SAVE);

  function start() {
    setState({ loading: true, success: false, error: null });
  }
  function succeed() {
    setState({ loading: false, success: true, error: null });
    setTimeout(() => setState(INITIAL_SAVE), 3000);
  }
  function fail(error: string) {
    setState({ loading: false, success: false, error });
  }
  function reset() {
    setState(INITIAL_SAVE);
  }

  return { state, start, succeed, fail, reset };
}

// ---------------------------------------------------------------------------
// Business section
// ---------------------------------------------------------------------------

function BusinessSection({ initialName }: { initialName: string }) {
  const [businessName, setBusinessName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { state, start, succeed, fail, reset } = useSaveState();

  function handleEdit() {
    setDraft(businessName);
    setEditing(true);
    reset();
  }

  function handleCancel() {
    setEditing(false);
    reset();
  }

  async function handleSave() {
    if (!draft.trim() || draft.trim() === businessName) {
      setEditing(false);
      return;
    }

    start();

    try {
      const res = await fetch("/api/settings/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        fail(json.error ?? "Something went wrong");
        return;
      }
      setBusinessName(draft.trim());
      setEditing(false);
      succeed();
    } catch {
      fail("Network error. Please try again.");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Business</h2>
        <p className="text-sm text-zinc-400 mt-0.5">
          Update your business information.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label className="text-zinc-300">Business name</Label>

          {!editing ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-white text-sm">{businessName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                className="text-zinc-500 hover:text-white hover:bg-zinc-700 shrink-0"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  className="text-zinc-500 hover:text-white hover:bg-zinc-700 shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {state.error && (
                <p className="text-sm text-red-400">{state.error}</p>
              )}

              <Button
                onClick={handleSave}
                disabled={state.loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {state.loading ? "Saving..." : "Save"}
              </Button>
            </div>
          )}

          {state.success && !editing && (
            <p className="text-sm text-emerald-400">Business name updated.</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Account section
// ---------------------------------------------------------------------------

function AccountSection({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");

  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileSave = useSaveState();
  const passwordSave = useSaveState();

  function handleEditProfile() {
    setDraftName(name);
    setDraftEmail(email);
    setEditingProfile(true);
    profileSave.reset();
  }

  function handleCancelProfile() {
    setEditingProfile(false);
    profileSave.reset();
  }

  async function handleSaveProfile() {
    profileSave.start();
    try {
      const res = await fetch("/api/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim(),
          email: draftEmail.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        profileSave.fail(json.error ?? "Something went wrong");
        return;
      }
      setName(draftName.trim());
      setEmail(draftEmail.trim());
      setEditingProfile(false);
      profileSave.succeed();
    } catch {
      profileSave.fail("Network error. Please try again.");
    }
  }

  async function handleSavePassword() {
    if (newPassword !== confirmPassword) {
      passwordSave.fail("New passwords do not match");
      return;
    }

    passwordSave.start();
    try {
      const res = await fetch("/api/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        passwordSave.fail(json.error ?? "Something went wrong");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditingPassword(false);
      passwordSave.succeed();
    } catch {
      passwordSave.fail("Network error. Please try again.");
    }
  }

  function handleCancelPassword() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setEditingPassword(false);
    passwordSave.reset();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Account</h2>
        <p className="text-sm text-zinc-400 mt-0.5">
          Update your personal information and password.
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 space-y-4 max-w-md">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400 font-medium">Profile</p>
          {!editingProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditProfile}
              className="text-zinc-500 hover:text-white hover:bg-zinc-700"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>

        {!editingProfile ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Name</p>
              <p className="text-white text-sm">{name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Email</p>
              <p className="text-white text-sm">{email || "—"}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Name</Label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                autoFocus
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email</Label>
              <Input
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {profileSave.state.error && (
              <p className="text-sm text-red-400">{profileSave.state.error}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={profileSave.state.loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {profileSave.state.loading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancelProfile}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {profileSave.state.success && !editingProfile && (
          <p className="text-sm text-emerald-400">Profile updated.</p>
        )}
      </div>

      {/* Password card */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 space-y-4 max-w-md">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400 font-medium">Password</p>
          {!editingPassword && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingPassword(true);
                passwordSave.reset();
              }}
              className="text-zinc-500 hover:text-white hover:bg-zinc-700"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>

        {!editingPassword ? (
          <p className="text-white text-sm tracking-widest">••••••••</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Current password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoFocus
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Confirm new password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {passwordSave.state.error && (
              <p className="text-sm text-red-400">{passwordSave.state.error}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSavePassword}
                disabled={passwordSave.state.loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {passwordSave.state.loading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancelPassword}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {passwordSave.state.success && !editingPassword && (
          <p className="text-sm text-emerald-400">Password updated.</p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

export function SettingsClient({
  isAdmin,
  businessName,
  userName,
  userEmail,
}: SettingsClientProps) {
  return (
    <div className="p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Manage your business and account preferences.
        </p>
      </div>

      {isAdmin && <BusinessSection initialName={businessName} />}
      <AccountSection initialName={userName} initialEmail={userEmail} />
    </div>
  );
}
