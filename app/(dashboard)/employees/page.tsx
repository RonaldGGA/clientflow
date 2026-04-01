"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { DeleteEmployeeDialog } from "@/components/employees/delete-employee-dialog";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

export default function EmployeesPage() {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? tCommon("error"));
        return;
      }
      setMembers(json.data.members);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEdit(member: Member) {
    setEditing(member);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditing(null);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(
      locale === "es" ? "es-CU" : "en-US",
      { month: "short", day: "numeric", year: "numeric" },
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {members.length}{" "}
            {locale === "es"
              ? `miembro${members.length !== 1 ? "s" : ""}`
              : `team member${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("addEmployee")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-zinc-900 border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">{t("table.name")}</TableHead>
              <TableHead className="text-zinc-400">
                {t("table.email")}
              </TableHead>
              <TableHead className="text-zinc-400">{t("table.role")}</TableHead>
              <TableHead className="text-zinc-400">
                {t("table.joinedAt")}
              </TableHead>
              <TableHead className="text-zinc-400 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-zinc-500 py-12"
                >
                  {tCommon("loading")}
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-zinc-500 py-12"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow
                  key={m.id}
                  className="border-zinc-800 hover:bg-zinc-800/50"
                >
                  <TableCell className="text-white font-medium">
                    {m.user.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {m.user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        m.role === "admin"
                          ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/20"
                          : "bg-zinc-700/50 text-zinc-300 border-zinc-600/30 hover:bg-zinc-700/50"
                      }
                    >
                      {t(`roles.${m.role as "admin" | "staff"}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {formatDate(m.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(m)}
                        className="text-zinc-500 hover:text-white hover:bg-zinc-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(m)}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={fetchMembers}
        editing={editing}
      />
      <DeleteEmployeeDialog
        member={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={fetchMembers}
      />
    </div>
  );
}
