import React from "react";
import Link from "next/link";
import { checkUser } from "@/lib/checkUser";
import HeaderNav from "./header-nav";

export default async function Header() {
  await checkUser();

  return (
    <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 group">
          <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent tracking-tight transition-opacity group-hover:opacity-90">
            Career
          </span>
          <span className="text-2xl font-extrabold text-white tracking-tight transition-opacity group-hover:opacity-90">
            AI
          </span>
        </Link>

        <HeaderNav />
      </nav>
    </header>
  );
}
