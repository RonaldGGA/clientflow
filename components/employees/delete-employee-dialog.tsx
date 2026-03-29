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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeleteEmployeeDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: DeleteEmployeeDialogProps) {
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Remove Employee
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            <span className="text-white font-medium">
              {member?.user.name ?? member?.user.email}
            </span>{" "}
            will lose access to the system. Their visit history will be
            preserved.
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
            {loading ? "Removing..." : "Remove Employee"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
