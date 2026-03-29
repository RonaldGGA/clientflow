"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import { DeleteServiceDialog } from "@/components/services/delete-service-dialog";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";

interface Service {
  id: string;
  name: string;
  basePrice: number;
  createdAt: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export default function ServicesSettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/services", { credentials: "include" });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to load services.");
        return;
      }

      setServices(json.data.services);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const handleCreate = () => {
    setEditingService(null);
    setFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormOpen(true);
  };

  const handleDeleteClick = (service: Service) => {
    setDeletingService(service);
    setDeleteOpen(true);
  };

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-8 px-1 py-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Wrench className="h-5 w-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Services
            </h1>
          </div>
          <p className="pl-11 text-sm text-zinc-500">
            {services.length > 0
              ? `${services.length} service${services.length !== 1 ? "s" : ""} configured`
              : "Configure the services your business offers"}
          </p>
        </div>

        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white gap-2 h-10 px-5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          New service
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ServicesSkeleton />
      ) : services.length === 0 ? (
        <EmptyState onCreate={handleCreate} />
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Service
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Base price
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="hover:bg-zinc-800/40 transition-colors group"
                >
                  <td className="px-5 py-4 font-medium text-white">
                    {service.name}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-medium text-emerald-400">
                      {formatPrice(service.basePrice)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(service)}
                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                        aria-label={`Edit ${service.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(service)}
                        className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        aria-label={`Delete ${service.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs — key forces remount with correct initial state */}
      <ServiceFormDialog
        key={editingService ? `edit-${editingService.id}` : "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editingService}
        onSuccess={fetchServices}
      />

      {deletingService && (
        <DeleteServiceDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          serviceId={deletingService.id}
          serviceName={deletingService.name}
          onSuccess={fetchServices}
        />
      )}
    </div>
  );
}

function ServicesSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="px-5 py-3.5" />
            <th className="px-5 py-3.5" />
            <th className="px-5 py-3.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i}>
              <td className="px-5 py-4">
                <div className="h-4 w-32 rounded-md bg-zinc-800 animate-pulse" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-16 rounded-md bg-zinc-800 animate-pulse ml-auto" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 w-14 rounded-md bg-zinc-800 animate-pulse ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 py-20 gap-3 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
        <Wrench className="h-5 w-5 text-zinc-500" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-white">No services yet</p>
        <p className="text-sm text-zinc-500 max-w-xs">
          Add the services your business offers — they&apos;ll be available when
          logging visits
        </p>
      </div>
      <Button
        onClick={onCreate}
        className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
      >
        <Plus className="h-4 w-4" />
        New service
      </Button>
    </div>
  );
}
