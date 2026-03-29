"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  basePrice: number;
}

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisitFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: VisitFormDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch clients and services when dialog opens
  useEffect(() => {
    if (!open) return;

    setLoadingOptions(true);
    setError(null);

    Promise.all([
      fetch("/api/clients?page=1&pageSize=200").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ])
      .then(([clientsRes, servicesRes]) => {
        setClients(clientsRes.data?.clients ?? []);
        setServices(servicesRes.data?.services ?? []);
      })
      .catch(() => setError("Failed to load clients and services"))
      .finally(() => setLoadingOptions(false));
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setClientId("");
      setServiceId("");
      setActualPrice("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  // When a service is selected, default actualPrice to its basePrice
  function handleServiceChange(value: string) {
    setServiceId(value);
    const selected = services.find((s) => s.id === value);
    if (selected) {
      setActualPrice(String(selected.basePrice));
    }
  }

  async function handleSubmit() {
    setError(null);

    if (!clientId) {
      setError("Please select a client");
      return;
    }
    if (!serviceId) {
      setError("Please select a service");
      return;
    }

    const price = parseFloat(actualPrice);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid non-negative number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceId,
          actualPrice: price,
          notes: notes.trim() || undefined,
        }),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Log Visit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client selector */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Client</Label>
            <Select
              value={clientId}
              onValueChange={(v) => setClientId(v ?? "")}
              disabled={loadingOptions}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {clients.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className="text-white focus:bg-zinc-700"
                  >
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service selector */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Service</Label>
            <Select
              value={serviceId}
              onValueChange={(v) => handleServiceChange(v ?? "")}
              disabled={loadingOptions}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {services.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="text-white focus:bg-zinc-700"
                  >
                    {s.name} — ${s.basePrice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price override */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">
              Price{" "}
              <span className="text-zinc-500 font-normal text-xs">
                (defaults to service base price)
              </span>
            </Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">
              Notes{" "}
              <span className="text-zinc-500 font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
            />
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
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingOptions}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {loading ? "Saving..." : "Log Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
