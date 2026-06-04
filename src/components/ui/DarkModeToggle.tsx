"use client";

import { useDarkMode } from "@/hooks/useDarkMode";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle({ className = "" }: { className?: string }) {
  const { dark, toggle } = useDarkMode();
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Mode clair" : "Mode sombre"}
      className={`text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
