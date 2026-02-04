"use client";

import type * as React from "react";
import {
  AlarmClockCheck,
  Folder,
  GalleryVerticalEnd,
  Landmark,
  Mail,
  TvMinimal,
  Users,
  Warehouse,
  Bell,
  DollarSign,
  Newspaper,
  Bug,
  Logs,
  Timer,
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
import { useEffect, useMemo, useState } from "react";
import { getUser as getEmployee } from "@/actions/auth/dal";
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
      title: "Attendance",
      url: "/hr/attendance",
      icon: Timer,
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
        {
          title: "All Documents",
          url: "/documents/all",
        },
        {
          title: "Archive",
          url: "/documents/archive",
        },
      ],
    },
    {
      title: "Finance",
      url: "/finance",
      icon: Landmark,
    },
    // Task/Performance is customized per role at runtime
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
        {
          title: "Ask HR",
          url: "/hr/ask-hr",
        },
        {
          title: "Loan Management",
          url: "/hr/loans",
        },
        {
          title: "Leave Management",
          url: "/hr/leaves",
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
    {
      title: "Payroll",
      url: "/payroll",
      icon: DollarSign,
      items: [
        {
          title: "Salary Structures",
          url: "/payroll/structure",
        },
        {
          title: "Employees",
          url: "/payroll/employees",
        },
        {
          title: "Payrun",
          url: "/payroll/payrun",
        },
      ],
    },
  ],
};

export function AppSidebar({
  user,
  employeeId,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User; employeeId: number }) {
  const [isManager, setIsManager] = useState<boolean | null>(null);
  const [isHrOrAdmin, setIsHrOrAdmin] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isFinanceOrAdmin, setIsFinanceOrAdmin] = useState<boolean>(false);
  const notifications = useQuery(api.notifications.getUserNotifications, {
    userId: employeeId,
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const emp = await getEmployee();
        if (active) {
          setIsManager(!!emp?.isManager);
          setIsAdmin(emp?.role === "admin");

          if (emp?.department === "hr" || emp?.role === "admin") {
            setIsHrOrAdmin(true);
          } else {
            setIsHrOrAdmin(false);
          }

          if (emp?.department === "finance" || emp?.role === "admin") {
            setIsFinanceOrAdmin(true);
          } else {
            setIsFinanceOrAdmin(false);
          }
        }
      } catch {
        if (active) {
          setIsManager(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const groupedItems = useMemo(() => {
    const base = data.navMain.filter((i) => i.title !== "Task/Performance");

    // Filter base items based on role permissions
    const filteredBase = base.filter((item) => {
      // Finance: only admin and finance can see
      if (item.title === "Finance") {
        return isFinanceOrAdmin;
      }

      // Hr: filter sub-items based on role
      if (item.title === "Hr") {
        const hrItems = item.items?.filter((subItem) => {
          // User Management and View Employees: only admin and hr can see
          if (
            subItem.title === "User Management" ||
            subItem.title === "View Employees"
          ) {
            return isHrOrAdmin;
          }
          // Other HR items visible to all
          return true;
        });

        // Only show Hr menu if user has access to at least one sub-item
        return hrItems && hrItems.length > 0;
      }

      // Payroll: only admin and hr can see
      if (item.title === "Payroll") {
        return isHrOrAdmin;
      }

      // All other items visible to all users
      return true;
    });

    // Update Hr items based on role
    const updatedBase = filteredBase.map((item) => {
      if (item.title === "Hr" && !isHrOrAdmin) {
        // Filter out restricted HR sub-items for non-hr/non-admin users
        return {
          ...item,
          items: item.items?.filter(
            (subItem) =>
              subItem.title !== "User Management" &&
              subItem.title !== "Employees",
          ),
        };
      }
      return item;
    });

    const taskItem = {
      title: "Task/Performance",
      url: "/tasks",
      icon: AlarmClockCheck,
      items: isHrOrAdmin
        ? [
            { title: "Task Items", url: "/tasks" },
            { title: "To Do", url: "/tasks/employee" },
            { title: "Submitted Tasks", url: "/tasks/manager" },
            { title: "All Company Tasks", url: "/tasks/all" },
            { title: "Self Assignment", url: "/tasks/self" },
          ]
        : isManager
          ? [
              { title: "Task Items", url: "/tasks" },
              { title: "To Do", url: "/tasks/employee" },
              { title: "Submitted Tasks", url: "/tasks/manager" },
              { title: "Self Assignment", url: "/tasks/self" },
            ]
          : [
              { title: "Tasks", url: "/tasks" },
              { title: "Self Assignment", url: "/tasks/self" },
            ],
    };
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

    const allItems = [...updatedBase, taskItem, newsItem];

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
      if (["Dashboard", "Attendance"].includes(item.title)) {
        groups.overview.push(item);
      } else if (
        ["Documents", "Mail", "Projects", "Task/Performance"].includes(
          item.title,
        )
      ) {
        groups.modules.push(item);
      } else if (["Finance", "Hr", "Payroll"].includes(item.title)) {
        groups.management.push(item);
      } else {
        groups.system.push(item);
      }
    });

    return groups;
  }, [isManager, isHrOrAdmin, isAdmin, isFinanceOrAdmin]);

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
