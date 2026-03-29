"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Service {
  id: string;
  name: string;
  basePrice: number;
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  basePrice: string; // string in the input, parsed to number on submit
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSuccess,
}: ServiceFormDialogProps) {
  const isEdit = Boolean(service);

  const [form, setForm] = useState<FormData>({
    name: service?.name ?? "",
    basePrice: service ? String(service.basePrice) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    const price = parseFloat(form.basePrice);
    if (isNaN(price) || price <= 0) {
      setError("Price must be a positive number.");
      return;
    }
    // Cap at 2 decimal places client-side before sending
    const roundedPrice = Math.round(price * 100) / 100;

    setLoading(true);
    try {
      const url = isEdit ? `/api/services/${service!.id}` : "/api/services";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          basePrice: roundedPrice,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEdit ? "Edit service" : "New service"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-zinc-300 text-sm">
              Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Classic Haircut"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="basePrice" className="text-zinc-300 text-sm">
              Base price <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">
                $
              </span>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                min="0.01"
                step="0.01"
                value={form.basePrice}
                onChange={handleChange}
                placeholder="0.00"
                className="pl-7 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              />
            </div>
            <p className="text-xs text-zinc-600">
              This is the default price. Visits can override it.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
