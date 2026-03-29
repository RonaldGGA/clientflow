"use client";

import { useState } from "react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeleteVisitDialog({
  visit,
  open,
  onOpenChange,
  onSuccess,
}: DeleteVisitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!visit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const date = visit
    ? new Date(visit.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Delete Visit
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This will permanently delete the visit for{" "}
            <span className="text-white font-medium">{visit?.client.name}</span>{" "}
            —{" "}
            <span className="text-white font-medium">
              {visit?.service.name}
            </span>{" "}
            on <span className="text-white font-medium">{date}</span>.
            <br />
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-red-400 px-1">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {loading ? "Deleting..." : "Delete Visit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
