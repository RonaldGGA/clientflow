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

interface DeleteServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceName: string;
  onSuccess: () => void;
}

export function DeleteServiceDialog({
  open,
  onOpenChange,
  serviceId,
  serviceName,
  onSuccess,
}: DeleteServiceDialogProps) {
  const t = useTranslations("settings.services.deleteDialog");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
        credentials: "include",
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
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            <span className="font-medium text-white">{serviceName}</span>{" "}
            {t("description", { name: serviceName })
              .replace(serviceName, "")
              .trim()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-red-400 px-1">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            disabled={loading}
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
