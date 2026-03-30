"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editing?: Member | null;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  onSuccess,
  editing = null,
}: EmployeeFormDialogProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editing !== null;

  useEffect(() => {
    if (open && editing) {
      setRole(editing.role as "admin" | "staff");
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);

    if (!isEditing) {
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      if (!email.trim()) {
        setError("Email is required");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }

    setLoading(true);
    try {
      const res = isEditing
        ? await fetch(`/api/employees/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
          })
        : await fetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              password,
              role,
            }),
          });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? tCommon("error"));
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEditing && (
            <div className="space-y-1.5">
              <Label className="text-zinc-300">{t("form.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
          )}

          {!isEditing && (
            <div className="space-y-1.5">
              <Label className="text-zinc-300">{t("form.email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("form.emailPlaceholder")}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
          )}

          {!isEditing && (
            <div className="space-y-1.5">
              <Label className="text-zinc-300">{t("form.password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("form.passwordPlaceholder")}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-zinc-300">{t("form.role")}</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setRole((v ?? "staff") as "admin" | "staff")
              }
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem
                  value="staff"
                  className="text-white focus:bg-zinc-700"
                >
                  {t("roles.staff")}
                </SelectItem>
                <SelectItem
                  value="admin"
                  className="text-white focus:bg-zinc-700"
                >
                  {t("roles.admin")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-zinc-400 hover:text-white"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {loading
              ? tCommon("saving")
              : isEditing
                ? tCommon("save")
                : tCommon("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
