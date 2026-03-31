"use client";

import { useSyncExternalStore, useCallback, useState } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Scissors, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "cf-sidebar-collapsed";

function subscribeSidebarState(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSidebarSnapshot(): boolean {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  const isCollapsed = useSyncExternalStore(
    subscribeSidebarState,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  const setCollapsed = useCallback((value: boolean) => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    window.dispatchEvent(
      new StorageEvent("storage", { key: SIDEBAR_STORAGE_KEY }),
    );
  }, []);

  return [isCollapsed, setCollapsed];
}

interface SidebarUser {
  name: string;
  email: string;
  image: string | null;
}

interface SidebarProps {
  user: SidebarUser;
  role: string;
  businessName: string;
}

interface SidebarContentProps {
  user: SidebarUser;
  role: string;
  isCollapsed: boolean;
  businessName: string;
}

function SidebarContent({
  user,
  role,
  isCollapsed,
  businessName,
}: SidebarContentProps) {
  return (
    <>
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-zinc-800 shrink-0",
          isCollapsed ? "justify-center" : "gap-2",
        )}
      >
        <Scissors className="w-5 h-5 text-emerald-500 shrink-0" />
        {!isCollapsed && (
          <span className="font-semibold text-white tracking-tight truncate">
            {businessName}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav role={role} isCollapsed={isCollapsed} />
      </div>

      <div className="shrink-0 border-t border-zinc-800">
        <UserMenu user={user} isCollapsed={isCollapsed} />
      </div>
    </>
  );
}

export function Sidebar({ user, role, businessName }: SidebarProps) {
  const [isCollapsed, setCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => setCollapsed(!isCollapsed);

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 bg-zinc-900 border-zinc-800 flex flex-col"
        >
          <SidebarContent
            user={user}
            role={role}
            isCollapsed={false}
            businessName={businessName}
          />
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "relative hidden lg:flex flex-col h-full bg-zinc-900/50 border-r border-zinc-800 transition-all duration-300 ease-in-out shrink-0",
          isCollapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarContent
          user={user}
          role={role}
          isCollapsed={isCollapsed}
          businessName={businessName}
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 shadow-sm"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </>
  );
}
