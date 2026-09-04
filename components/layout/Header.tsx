"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className="
        fixed inset-x-0 top-0 z-50
        h-16
        border-b border-white/5
        bg-black/80
        backdrop-blur-xl
      "
    >
      <div className="flex h-full items-center px-4 sm:px-6 lg:pl-72 lg:pr-8">
        {/* Mobile Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 lg:hidden"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <span className="text-sm font-black text-white">
              L
            </span>
          </div>

          <span className="text-lg font-bold tracking-tight text-white">
            Luma<span className="text-red-500">Vault</span>
          </span>
        </Link>

        {/* Desktop Page Title */}
        <div className="hidden lg:block">
          <h1 className="text-sm font-medium text-white/60">
            {getPageTitle(pathname)}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {/* Search */}
          {searchOpen ? (
            <div className="flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <Search className="mr-2 h-4 w-4 text-white/50" />

              <input
                autoFocus
                type="text"
                placeholder="Search movies & series..."
                className="
                  w-32 bg-transparent text-sm text-white
                  outline-none placeholder:text-white/30
                  sm:w-56
                "
              />

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="ml-2 text-white/50 transition hover:text-white"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="
                rounded-full p-2
                text-white/60
                transition
                hover:bg-white/10
                hover:text-white
              "
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {/* Notifications */}
          <button
            type="button"
            className="
              relative rounded-full p-2
              text-white/60
              transition
              hover:bg-white/10
              hover:text-white
            "
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>

          {/* Profile */}
          <button
            type="button"
            className="
              flex h-9 w-9 items-center justify-center
              rounded-full
              bg-white/10
              text-white/70
              transition
              hover:bg-white/20
              hover:text-white
            "
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function getPageTitle(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/movies")) return "Movies";
  if (pathname.startsWith("/series")) return "Series";
  if (pathname.startsWith("/library")) return "My Library";
  if (pathname.startsWith("/search")) return "Search";

  return "LumaVault";
}