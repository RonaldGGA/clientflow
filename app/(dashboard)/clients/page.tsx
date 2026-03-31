"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  StickyNote,
  Users,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ClientsPage() {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");

  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      params.set("page", String(page));
      const res = await fetch(`/api/clients?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? tCommon("error"));
        return;
      }
      setClients(json.data.clients);
      setPagination(json.data.pagination);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, tCommon]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-8 p-6 sm:px-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {t("title")}
            </h1>
          </div>
          <p className="pl-11 text-sm text-zinc-500">
            {pagination
              ? `${pagination.total} ${t("title").toLowerCase()}`
              : t("searchPlaceholder")}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            setFormOpen(true);
          }}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white gap-2 h-10 px-5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          {t("addClient")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10 h-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500 rounded-xl"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : clients.length === 0 ? (
        <EmptyState
          hasQuery={debouncedQuery.length > 0}
          onCreate={() => {
            setEditingClient(null);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      {t("table.name")}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hidden sm:table-cell">
                      {t("table.phone")}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hidden md:table-cell">
                      {t("table.notes")}
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      {t("table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <span className="font-medium text-white">
                          {client.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        {client.phone ? (
                          <span className="flex items-center gap-2 text-zinc-400">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                            {client.phone}
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell max-w-55">
                        {client.notes ? (
                          <span className="flex items-center gap-2 text-zinc-400">
                            <StickyNote className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                            <span className="truncate">{client.notes}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingClient(client);
                              setFormOpen(true);
                            }}
                            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                            aria-label={`${tCommon("edit")} ${client.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingClient(client);
                              setDeleteOpen(true);
                            }}
                            className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                            aria-label={`${tCommon("delete")} ${client.name}`}
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
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-zinc-500">
                {pagination.page} / {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={pagination.page <= 1}
                  className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ClientFormDialog
        key={editingClient ? `edit-${editingClient.id}` : "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
        onSuccess={fetchClients}
      />
      {deletingClient && (
        <DeleteClientDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          clientId={deletingClient.id}
          clientName={deletingClient.name}
          onSuccess={fetchClients}
        />
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="px-5 py-3.5" />
            <th className="px-5 py-3.5 hidden sm:table-cell" />
            <th className="px-5 py-3.5 hidden md:table-cell" />
            <th className="px-5 py-3.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td className="px-5 py-4">
                <div className="h-4 w-28 rounded-md bg-zinc-800 animate-pulse" />
              </td>
              <td className="px-5 py-4 hidden sm:table-cell">
                <div className="h-4 w-24 rounded-md bg-zinc-800 animate-pulse" />
              </td>
              <td className="px-5 py-4 hidden md:table-cell">
                <div className="h-4 w-36 rounded-md bg-zinc-800 animate-pulse" />
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

function EmptyState({
  hasQuery,
  onCreate,
}: {
  hasQuery: boolean;
  onCreate: () => void;
}) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 py-20 gap-3 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
        <Users className="h-5 w-5 text-zinc-500" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-white">
          {hasQuery ? tCommon("noResults") : t("empty")}
        </p>
        <p className="text-sm text-zinc-500 max-w-xs">
          {hasQuery ? t("searchPlaceholder") : t("form.notesPlaceholder")}
        </p>
      </div>
      {!hasQuery && (
        <Button
          onClick={onCreate}
          className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("addClient")}
        </Button>
      )}
    </div>
  );
}
