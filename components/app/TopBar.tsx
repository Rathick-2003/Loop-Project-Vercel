"use client";

import { signOut } from "next-auth/react";
import { Session } from "next-auth";
import { useState } from "react";

interface TopBarProps {
  onMenuClick: () => void;
  session: Session;
}

export function TopBar({ onMenuClick, session }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-zinc-800/60 bg-zinc-900/70 px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="relative flex items-center gap-3">
        <span className="hidden text-xs text-zinc-500 sm:block">
          {session.user?.email}
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase hover:bg-emerald-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            aria-label="User menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {(session.user?.name ?? session.user?.email ?? "U").charAt(0)}
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-xl border border-zinc-700/60 bg-zinc-900 py-1 shadow-xl ring-1 ring-black/20">
                <div className="border-b border-zinc-800/60 px-4 py-2">
                  <p className="truncate text-xs font-medium text-zinc-200">
                    {session.user?.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {session.user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
