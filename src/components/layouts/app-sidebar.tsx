"use client";

import type * as React from "react";
import {
  Folder,
  GalleryVerticalEnd,
  Mail,
  TvMinimal,
  Users,
  Warehouse,
  Bell,
  Newspaper,
  Bug,
  Logs,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import type { User } from "better-auth";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const data = {
  org: [
    {
      name: "HJRBDA",
      logo: GalleryVerticalEnd,
      plan: "Management System",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: TvMinimal,
      isActive: false,
    },
    {
      title: "Documents",
      url: "/documents",
      icon: Folder,
      isActive: false,
      items: [
        {
          title: "Main",
          url: "/documents",
        },
        {
          title: "Search",
          url: "/documents/search",
        },
      ],
    },
    {
      title: "Mail",
      url: "/mail/inbox",
      icon: Mail,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Warehouse,
      items: [
        {
          title: "Projects",
          url: "/projects",
        },
        {
          title: "Contractors",
          url: "/projects/contractors",
        },
        {
          title: "Photo Upload",
          url: "/photos/upload",
        },
      ],
    },
    {
      title: "Hr",
      url: "/hr",
      icon: Users,
      items: [
        {
          title: "User Management",
          url: "/hr/admin/users?page=1&limit=10",
        },
        {
          title: "Employees",
          url: "/hr/employees",
        },
      ],
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      items: [
        {
          title: "View Notifications",
          url: "/notification",
        },
        {
          title: "Notifications Preferences",
          url: "/notification-preferences",
        },
      ],
    },
  ],
};

export function AppSidebar({
  user,
  employeeId,
  employeeRole,
  employeeDepartment,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User;
  employeeId: number;
  employeeRole: string;
  employeeDepartment: string;
}) {
  const isAdmin = employeeRole === "admin" || employeeDepartment === "admin";
  const isHrOrAdmin =
    employeeDepartment === "hr" ||
    employeeRole === "admin" ||
    employeeDepartment === "admin";
  const notifications = useQuery(api.notifications.getUserNotifications, {
    userId: employeeId,
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length;

  const groupedItems = useMemo(() => {
    const base = [...data.navMain];

    // Filter base items based on role permissions
    const filteredBase = base.filter((item) => {
      if (item.title === "Hr") {
        // Show Hr menu only to HR department and admin users
        return isHrOrAdmin;
      }

      // Payroll: only admin and hr can see
      if (item.title === "Payroll") {
        return isHrOrAdmin;
      }

      // All other items visible to all users
      return true;
    });

    // Update Hr sub-items:
    // "User Management" → admin only (role=admin OR dept=admin)
    // "Employees" → HR department and admin
    const updatedBase = filteredBase.map((item) => {
      if (item.title === "Hr") {
        return {
          ...item,
          items: item.items?.filter((subItem) => {
            if (subItem.title === "User Management") {
              return isAdmin;
            }
            return true; // Employees and other items visible to all isHrOrAdmin
          }),
        };
      }
      return item;
    });

    const newsItem = {
      title: "News",
      url: "/news",
      icon: Newspaper,
      items: isHrOrAdmin
        ? [
            { title: "View News", url: "/news" },
            { title: "Manage News", url: "/news/manage" },
          ]
        : [{ title: "View News", url: "/news" }],
    };

    const allItems = [...updatedBase, newsItem];

    // Only show Data Export to admins
    if (isAdmin) {
      allItems.push({
        title: "Data Export",
        url: "/logs",
        icon: Logs,
        isActive: false,
      });
    }

    allItems.push({
      title: "Support/Feedback",
      url: "/bug",
      icon: Bug,
      isActive: false,
    });

    const groups = {
      overview: [] as typeof allItems,
      modules: [] as typeof allItems,
      management: [] as typeof allItems,
      system: [] as typeof allItems,
    };

    allItems.forEach((item) => {
      if (["Dashboard"].includes(item.title)) {
        groups.overview.push(item);
      } else if (["Documents", "Mail", "Projects"].includes(item.title)) {
        groups.modules.push(item);
      } else if (item.title === "Hr") {
        groups.management.push(item);
      } else {
        groups.system.push(item);
      }
    });

    return groups;
  }, [isHrOrAdmin, isAdmin]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.org} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={groupedItems.overview} />
        <NavMain items={groupedItems.modules} label="Modules" />
        <NavMain items={groupedItems.management} label="Management" />
        <NavMain
          items={groupedItems.system}
          label="System"
          unreadCount={unreadCount}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
