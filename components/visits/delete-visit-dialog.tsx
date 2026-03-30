"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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

interface Visit {
  id: string;
  client: { name: string };
  service: { name: string };
  createdAt: string;
}

interface DeleteVisitDialogProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteVisitDialog({
  visit,
  open,
  onOpenChange,
  onSuccess,
}: DeleteVisitDialogProps) {
  const t = useTranslations("visits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!visit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visit.id}`, { method: "DELETE" });
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

  const date = visit
    ? new Date(visit.createdAt).toLocaleDateString(
        locale === "es" ? "es-CU" : "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      )
    : "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            {t("deleteDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            {t("deleteDialog.description")}
            {visit && (
              <>
                {" "}
                <span className="text-white font-medium">
                  {visit.client.name}
                </span>
                {" — "}
                <span className="text-white font-medium">
                  {visit.service.name}
                </span>{" "}
                {locale === "es" ? "el" : "on"}{" "}
                <span className="text-white font-medium">{date}</span>.
              </>
            )}
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
            {loading ? tCommon("deleting") : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
