"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Film,
  Tv,
  Library,
  Clock3,
  Heart,
  Settings,
  Info,
  Search,
} from "lucide-react";

const mainNavigation = [
  {
    label: "Home",
    href: "/",
    icon: Home,
  },
  {
    label: "Movies",
    href: "/movies",
    icon: Film,
  },
  {
    label: "Series",
    href: "/series",
    icon: Tv,
  },
  {
    label: "My Library",
    href: "/library",
    icon: Library,
  },
];

const secondaryNavigation = [
  {
    label: "Continue Watching",
    href: "/library?filter=continue",
    icon: Clock3,
  },
  {
    label: "My List",
    href: "/library?filter=favorites",
    icon: Heart,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        fixed left-0 top-0 z-50
        hidden h-screen w-64
        flex-col
        border-r border-white/5
        bg-black
        lg:flex
      "
    >
      {/* Brand */}
      <div className="flex h-20 items-center px-7">
        <Link
          href="/"
          className="group flex items-center gap-3"
        >
          <div
            className="
              flex h-10 w-10 items-center justify-center
              rounded-xl
              bg-red-600
              shadow-lg shadow-red-600/20
              transition
              group-hover:bg-red-500
            "
          >
            <span className="text-lg font-black text-white">
              L
            </span>
          </div>

          <div>
            <div className="text-xl font-bold tracking-tight text-white">
              Luma<span className="text-red-500">Vault</span>
            </div>

            <div className="text-[10px] uppercase tracking-[0.25em] text-white/30">
              Personal Media
            </div>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-5 pb-5">
        <Link
          href="/search"
          className="
            flex items-center gap-3
            rounded-xl
            border border-white/5
            bg-white/5
            px-4 py-3
            text-sm text-white/40
            transition
            hover:border-white/10
            hover:bg-white/[0.08]
            hover:text-white/70
          "
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
          <span className="ml-auto text-[10px] text-white/20">
            /
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4">
        <NavSection
          title="Browse"
          items={mainNavigation}
          pathname={pathname}
        />

        <div className="my-6 h-px bg-white/5" />

        <NavSection
          title="Your Library"
          items={secondaryNavigation}
          pathname={pathname}
        />
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/5 p-4">
        <Link
          href="/settings"
          className="
            flex items-center gap-3
            rounded-xl
            px-4 py-3
            text-sm text-white/50
            transition
            hover:bg-white/5
            hover:text-white
          "
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>

        <Link
          href="/about"
          className="
            flex items-center gap-3
            rounded-xl
            px-4 py-3
            text-sm text-white/50
            transition
            hover:bg-white/5
            hover:text-white
          "
        >
          <Info className="h-5 w-5" />
          About LumaVault
        </Link>

        <div className="mt-4 px-4 pb-2 text-[10px] text-white/20">
          LumaVault
          <span className="mx-1">•</span>
          Personal Media Server
        </div>
      </div>
    </aside>
  );
}

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavigationItem[];
  pathname: string;
}) {
  return (
    <div>
      <p className="mb-3 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
        {title}
      </p>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href.split("?")[0]);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative flex items-center gap-4
                rounded-xl px-4 py-3
                text-sm font-medium
                transition-all
                ${
                  active
                    ? "bg-red-600/10 text-white"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              {active && (
                <span className="absolute left-0 h-6 w-1 rounded-r-full bg-red-500" />
              )}

              <Icon
                className={`
                  h-5 w-5
                  ${
                    active
                      ? "text-red-500"
                      : "text-white/40 group-hover:text-white"
                  }
                `}
              />

              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}