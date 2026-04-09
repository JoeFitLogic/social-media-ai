"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Film, Play, Users, Settings2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Videos", href: "/videos", icon: Film },
  { title: "Run Pipeline", href: "/run", icon: Play },
  { title: "Creators", href: "/creators", icon: Users },
  { title: "Configs", href: "/configs", icon: Settings2 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((videos: { dateAdded: string }[]) => {
        if (videos.length > 0 && videos[0].dateAdded) {
          setLastRun(videos[0].dateAdded);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Sidebar className="border-r border-white/[0.06]">
      <SidebarHeader className="px-5 py-6">
        <div className="flex flex-col gap-2">
          <img
            src="https://assets.cdn.filesafe.space/Evr1MAVgkA3M5UKIH3dK/media/66df41d80b37b2003c3d1628.webp"
            alt="7FSS Virality System"
            className="h-10 w-auto object-contain"
          />
          <p className="text-[11px] text-muted-foreground pl-0.5">Instagram Reels AI</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-10 rounded-xl px-3 transition-all duration-200 data-[active=true]:text-[oklch(0.72_0.13_82)]"
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="text-[13px]">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {lastRun && (
        <SidebarFooter className="px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            Last pipeline: <span className="text-foreground/70">{lastRun}</span>
          </p>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
