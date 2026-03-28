"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  UserCog,
  FileText,
  Settings,
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
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "Visits",
    href: "/visits",
    icon: CalendarCheck,
    adminOnly: false,
  },
  {
    label: "Employees",
    href: "/employees",
    icon: UserCog,
    adminOnly: true,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    adminOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    adminOnly: true,
  },
];

interface SidebarNavProps {
  role: string;
  isCollapsed: boolean;
}

export function SidebarNav({ role, isCollapsed }: SidebarNavProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <TooltipProvider delay={100}>
      <nav className="flex flex-col gap-1 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isCollapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "shrink-0 h-4 w-4",
                  isActive ? "text-emerald-400" : "",
                )}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>
    </TooltipProvider>
  );
}
