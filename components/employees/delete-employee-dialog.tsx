"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

interface DeleteEmployeeDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteEmployeeDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: DeleteEmployeeDialogProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!member) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${member.id}`, {
        method: "DELETE",
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            {t("deleteDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            <span className="text-white font-medium">
              {member?.user.name ?? member?.user.email}
            </span>{" "}
            {
              t("deleteDialog.description", {
                name: member?.user.name ?? member?.user.email ?? "",
              }).split(member?.user.name ?? member?.user.email ?? "")[1]
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-red-400 px-1">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {loading ? tCommon("deleting") : t("deleteDialog.title")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
