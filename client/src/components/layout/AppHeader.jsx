import { useLocation, useNavigate } from "react-router";
import { LogOut, UserRound, ChevronDown } from "lucide-react";

import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/LanguageContext";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/villages": "Village Management",
  "/schemes": "Scheme Management",
  "/suppliers": "Suppliers",
  "/asset-management": "Asset Management",
  "/inventory": "Inventory",
  "/maintenance": "Maintenance",
  "/consumers": "Consumers",
  "/billing": "Billing & Payments",
  "/finance": "Finance",
  "/reports": "Reports",
  "/users": "User Management",
};

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const pageTitle = pageTitles[location.pathname] || "AquaX";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />

        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {t(pageTitle)}
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {t("Water Infrastructure & Operations Management")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={toggleLanguage} title="Change language">{language === "en" ? "हिंदी" : "English"}</Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="flex items-center gap-2 px-2" />}
        >
            <Avatar className="size-8">
              <AvatarFallback className="bg-blue-100 text-sm font-semibold text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>

            <span className="hidden text-sm font-medium sm:inline">
              {user?.name || "User"}
            </span>

            <ChevronDown size={15} />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span>{user?.name || "User"}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled>
            <UserRound className="mr-2 size-4" />
            {t("Account")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 size-4" />
            {t("Logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}