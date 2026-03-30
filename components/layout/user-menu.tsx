"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  isCollapsed: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ user, isCollapsed }: UserMenuProps) {
  const router = useRouter();
  const t = useTranslations("userMenu");

  const handleSignOut = async () => {
    await authClient.signOut();
    document.cookie = "cf-role=; Max-Age=0; path=/";
    window.location.href = "/login";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-zinc-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500",
            isCollapsed ? "justify-center px-2" : "",
          )}
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8 shrink-0">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align={isCollapsed ? "center" : "start"}
        sideOffset={4}
        className="w-56 bg-zinc-900 border-zinc-800"
      >
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-zinc-500">{user.email}</p>
        </div>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="gap-2 text-zinc-400 focus:text-white focus:bg-zinc-800 cursor-pointer"
        >
          <User className="h-4 w-4" />
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
