"use client";

/**
 * Authenticated application frame.
 *  - Mobile: bottom tab bar (thumb-reachable, safe-area aware)
 *  - Desktop: left rail with wordmark and labels
 * Also guards the route: signed-out users → /signin, unfinished
 * onboarding → /onboarding.
 */

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Home, Compass, PlusCircle, MessageCircle, UserRound, Bell } from "lucide-react";
import { useViewer, useUnreadNotifications } from "@/components/providers";
import { ListSkeleton } from "@/components/ui/Skeleton";

const NAV = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/outings/new", label: "Pitch", Icon: PlusCircle },
  { href: "/chats", label: "Chats", Icon: MessageCircle },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/outings/new") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { viewer, loading } = useViewer();
  const pathname = usePathname();
  const router = useRouter();
  const unread = useUnreadNotifications(!!viewer);

  useEffect(() => {
    if (loading) return;
    if (!viewer) {
      router.replace("/signin");
    } else if (!viewer.user.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [loading, viewer, router]);

  if (loading || !viewer || !viewer.user.onboardingComplete) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <ListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sand-200 bg-surface px-4 py-6 lg:flex">
        <Link href="/home" className="mb-8 flex items-center gap-2.5 px-2">
          <span className="organic-blob flex h-9 w-9 items-center justify-center bg-terracotta-500 font-display text-lg text-sand-50">
            S
          </span>
          <span className="font-display text-xl font-medium text-ink">Soul Tribe</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-terracotta-500/10 text-terracotta-600"
                    : "text-ink-soft hover:bg-sand-100 hover:text-ink"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/notifications"
          className={clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive(pathname, "/notifications")
              ? "bg-terracotta-500/10 text-terracotta-600"
              : "text-ink-soft hover:bg-sand-100 hover:text-ink"
          )}
        >
          <span className="relative">
            <Bell className="h-5 w-5" aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-terracotta-500 px-1 text-[10px] font-bold text-sand-50">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          Notifications
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-sand-200/70 bg-sand-50/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <span className="organic-blob flex h-8 w-8 items-center justify-center bg-terracotta-500 font-display text-base text-sand-50">
            S
          </span>
          <span className="font-display text-lg font-medium text-ink">Soul Tribe</span>
        </Link>
        <Link
          href="/notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative rounded-full p-2 text-ink-soft transition-colors hover:bg-sand-100"
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-terracotta-500 px-1 text-[10px] font-bold text-sand-50">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-6 lg:ml-60 lg:max-w-3xl lg:px-10 lg:pb-16 lg:pt-10">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200/70 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            const isPitch = href === "/outings/new";
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors",
                  active ? "text-terracotta-600" : "text-ink-faint hover:text-ink-soft"
                )}
              >
                {active && !isPitch && (
                  <motion.span
                    layoutId="mobile-nav-dot"
                    className="absolute top-0.5 h-1 w-6 rounded-pill bg-terracotta-500"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  className={clsx("h-6 w-6", isPitch && "text-terracotta-500")}
                  strokeWidth={isPitch ? 2.2 : 2}
                  aria-hidden
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
