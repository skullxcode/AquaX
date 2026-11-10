import {
  LayoutDashboard,
  Map,
  MapPin,
  Layers3,
  Truck,
  Package,
  Wrench,
  Users,
  Receipt,
  Wallet,
  BarChart3,
  Droplets,
  UserCog,
} from "lucide-react";
import { useLocation, NavLink } from "react-router";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/useAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigation = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { title: "Villages", url: "/villages", icon: MapPin },
      { title: "Schemes", url: "/schemes", icon: Layers3 },
      { title: "Asset Management", url: "/assets", icon: Map },
      { title: "Inventory", url: "/inventory", icon: Package },
      { title: "Suppliers", url: "/suppliers", icon: Truck },
      { title: "Maintenance", url: "/maintenance", icon: Wrench },
      { title: "Consumers", url: "/consumers", icon: Users },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    items: [{ title: "User Management", url: "/users", icon: UserCog }],
  },
  {
    label: "Finance & Reports",
    items: [
      { title: "Billing & Payments", url: "/billing", icon: Receipt },
      { title: "Finance", url: "/finance", icon: Wallet },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
];

export default function AppSidebar() {
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const visibleNavigation = navigation.filter((group) => !group.adminOnly || user?.role === "PANCHAYAT_ADMIN");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Droplets size={21} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">AquaX</span>
            <span className="text-xs text-muted-foreground">Manage. Monitor. Sustain.</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {visibleNavigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = location.pathname === item.url || location.pathname.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<NavLink to={item.url} />}
                      isActive={isActive}
                      tooltip={t(item.title)}
                    >
                      <item.icon size={18} />
                      <span>{t(item.title)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <p className="text-xs text-muted-foreground">{t("Water Infrastructure Management")}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
