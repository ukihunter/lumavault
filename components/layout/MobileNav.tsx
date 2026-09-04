"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Film,
  Tv,
  Library,
  Search,
} from "lucide-react";

const navigation = [
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
    label: "Library",
    href: "/library",
    icon: Library,
  },
  {
    label: "Search",
    href: "/search",
    icon: Search,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed inset-x-0 bottom-0 z-50
        border-t border-white/10
        bg-black/90
        px-2 pb-[env(safe-area-inset-bottom)]
        backdrop-blur-xl
        lg:hidden
      "
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navigation.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex min-w-14 flex-col
                items-center justify-center
                gap-1
                transition
                ${
                  active
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                }
              `}
            >
              {active && (
                <span
                  className="
                    absolute -top-0.5
                    h-0.5 w-8
                    rounded-full
                    bg-red-500
                  "
                />
              )}

              <Icon
                className={`
                  h-5 w-5
                  ${active ? "text-red-500" : ""}
                `}
              />

              <span className="text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}