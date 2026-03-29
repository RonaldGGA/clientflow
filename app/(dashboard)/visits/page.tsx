"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { DeleteVisitDialog } from "@/components/visits/delete-visit-dialog";
import {
  VisitsFilters,
  type VisitFilters,
} from "@/components/visits/visits-filters";
import { authClient } from "@/lib/auth-client";
import { VisitFormDialog } from "@/components/visits/visit-form-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Visit {
  id: string;
  actualPrice: number;
  notes: string | null;
  createdAt: string;
  client: { id: string; name: string };
  service: { id: string; name: string };
  staff: { id: string; name: string | null };
}

interface VisitsResponse {
  visits: Visit[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pageInfo, setPageInfo] = useState({
    page: 1,
    pageCount: 1,
    total: 0,
  });
  const [filters, setFilters] = useState<VisitFilters>({
    from: "",
    to: "",
    staffId: "",
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Visit | null>(null);

  // Role — read from the cf-role cookie via authClient session
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log(document.cookie[2]);
    const role = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith("cf-role="))
      ?.split("=")[1]
      ?.trim();
    setIsAdmin(role === "admin");
    console.log("ROLE", role);
  }, []);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page) });
    if (filters.from) params.set("from", `${filters.from}T00:00:00.000Z`);
    if (filters.to) params.set("to", `${filters.to}T23:59:59.999Z`);
    if (filters.staffId) params.set("staffId", filters.staffId);

    try {
      const res = await fetch(`/api/visits?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to load visits");
        return;
      }

      const data: VisitsResponse = json.data;
      setVisits(data.visits);
      setPageInfo({
        page: data.page,
        pageCount: data.pageCount,
        total: data.total,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Reset to page 1 when filters change
  function handleFiltersChange(next: VisitFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleDeleteClick(visit: Visit) {
    setDeleteTarget(visit);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Visits</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {pageInfo.total} total visit{pageInfo.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Visit
        </Button>
      </div>

      {/* Filters */}
      <VisitsFilters
        isAdmin={isAdmin}
        filters={filters}
        onChange={handleFiltersChange}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Client</TableHead>
              <TableHead className="text-zinc-400">Service</TableHead>
              {isAdmin && (
                <TableHead className="text-zinc-400">Staff</TableHead>
              )}
              <TableHead className="text-zinc-400">Price</TableHead>
              <TableHead className="text-zinc-400">Date</TableHead>
              <TableHead className="text-zinc-400">Notes</TableHead>
              {isAdmin && <TableHead className="text-zinc-400 w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 7 : 5}
                  className="text-center text-zinc-500 py-12"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : visits.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 7 : 5}
                  className="text-center text-zinc-500 py-12"
                >
                  No visits found.
                </TableCell>
              </TableRow>
            ) : (
              visits.map((visit) => (
                <TableRow
                  key={visit.id}
                  className="border-zinc-800 hover:bg-zinc-800/50"
                >
                  <TableCell className="text-white font-medium">
                    {visit.client.name}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {visit.service.name}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-zinc-300">
                      {visit.staff.name ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-emerald-400 font-medium">
                    {formatPrice(visit.actualPrice)}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {formatDate(visit.createdAt)}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm max-w-xs truncate">
                    {visit.notes ?? "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(visit)}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageInfo.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>
            Page {pageInfo.page} of {pageInfo.pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1 || loading}
              className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pageInfo.pageCount || loading}
              className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <VisitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchVisits}
      />

      <DeleteVisitDialog
        visit={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={fetchVisits}
      />
    </div>
  );
}
