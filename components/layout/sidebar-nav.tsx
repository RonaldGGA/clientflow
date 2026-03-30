"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  UserCog,
  FileText,
  Settings,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard, adminOnly: true },
  { key: "clients", href: "/clients", icon: Users, adminOnly: false },
  { key: "visits", href: "/visits", icon: CalendarCheck, adminOnly: false },
  { key: "employees", href: "/employees", icon: UserCog, adminOnly: true },
  { key: "reports", href: "/reports", icon: FileText, adminOnly: true },
  { key: "settings", href: "/settings", icon: Settings, adminOnly: true },
];

const SETTINGS_SUB_ITEMS: NavItem[] = [
  {
    key: "services",
    href: "/settings/services",
    icon: Scissors,
    adminOnly: true,
  },
];

interface SidebarNavProps {
  role: string;
  isCollapsed: boolean;
}

export function SidebarNav({ role, isCollapsed }: SidebarNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isAdmin = role === "admin";

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const inSettings = pathname.startsWith("/settings");

  function renderLink(item: NavItem, isSubItem = false) {
    const Icon = item.icon;
    const label = t(item.key);
    const isActive =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/");

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isCollapsed ? "justify-center px-2" : "",
          isSubItem && !isCollapsed ? "ml-4 py-1.5 text-xs" : "",
          isActive
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
        )}
      >
        <Icon
          className={cn(
            "shrink-0",
            isSubItem ? "h-3.5 w-3.5" : "h-4 w-4",
            isActive ? "text-emerald-400" : "",
          )}
        />
        {!isCollapsed && <span>{label}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  }

  return (
    <TooltipProvider delay={100}>
      <nav className="flex flex-col gap-1 px-2">
        {visibleItems.map((item) => (
          <div key={item.href}>
            {renderLink(item)}

            {/* Sub-items under Settings — visible when in /settings/* */}
            {item.key === "settings" && inSettings && !isCollapsed && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {SETTINGS_SUB_ITEMS.filter(
                  (sub) => !sub.adminOnly || isAdmin,
                ).map((sub) => renderLink(sub, true))}
              </div>
            )}

            {/* Collapsed mode: show sub-items as separate tooltip icons */}
            {item.key === "settings" && inSettings && isCollapsed && (
              <>
                {SETTINGS_SUB_ITEMS.filter(
                  (sub) => !sub.adminOnly || isAdmin,
                ).map((sub) => renderLink(sub, false))}
              </>
            )}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}
