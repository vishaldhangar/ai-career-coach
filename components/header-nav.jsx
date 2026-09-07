"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  PenBox,
  LayoutDashboard,
  FileText,
  GraduationCap,
  ChevronDown,
  StarsIcon,
} from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const growthRoutes = ["/resume", "/ai-cover-letter", "/interview"];

export default function HeaderNav() {
  const pathname = usePathname();

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");
  const isGrowthActive = growthRoutes.some((r) => isActive(r));

  return (
    <div className="flex items-center space-x-2 md:space-x-4">
      <SignedIn>
        {/* Industry Insights */}
        <Link href="/dashboard">
          <Button
            variant="outline"
            className={cn(
              "hidden md:inline-flex items-center gap-2 transition-all duration-200",
              isActive("/dashboard") &&
                "border-primary/60 bg-primary/10 text-primary"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Industry Insights
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "md:hidden w-10 h-10 p-0",
              isActive("/dashboard") && "text-primary"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </Link>

        {/* Growth Tools Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                "flex items-center gap-2 transition-all duration-200",
                isGrowthActive && "ring-1 ring-primary/40"
              )}
            >
              <StarsIcon className="h-4 w-4" />
              <span className="hidden md:block">Growth Tools</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link
                href="/resume"
                className={cn(
                  "flex items-center gap-2",
                  isActive("/resume") && "text-primary font-medium"
                )}
              >
                <FileText className="h-4 w-4" />
                Build Resume
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/ai-cover-letter"
                className={cn(
                  "flex items-center gap-2",
                  isActive("/ai-cover-letter") && "text-primary font-medium"
                )}
              >
                <PenBox className="h-4 w-4" />
                Cover Letter
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/interview"
                className={cn(
                  "flex items-center gap-2",
                  isActive("/interview") && "text-primary font-medium"
                )}
              >
                <GraduationCap className="h-4 w-4" />
                Interview Prep
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SignedIn>

      <SignedOut>
        <SignInButton>
          <Button variant="outline">Sign In</Button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-10 h-10",
              userButtonPopoverCard: "shadow-xl",
              userPreviewMainIdentifier: "font-semibold",
            },
          }}
          afterSignOutUrl="/"
        />
      </SignedIn>
    </div>
  );
}
