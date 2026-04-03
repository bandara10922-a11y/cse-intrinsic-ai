"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  TrendingUp, Search, Bell, Moon, Sun, BarChart2,
  Briefcase, Star, Menu, X, Activity, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketStatusBadgeProps {
  isOpen: boolean;
}
function MarketStatusBadge({ isOpen }: MarketStatusBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
      isOpen
        ? "bg-signal-strong-buy/15 text-signal-strong-buy border border-signal-strong-buy/30"
        : "bg-muted text-muted-foreground border border-border"
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        isOpen ? "bg-signal-strong-buy animate-pulse" : "bg-muted-foreground"
      )} />
      {isOpen ? "MARKET OPEN" : "MARKET CLOSED"}
    </div>
  );
}

interface HeaderProps {
  marketOpen?: boolean;
}

export function Header({ marketOpen = false }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: BarChart2 },
    { href: "/stocks", label: "All Stocks", icon: TrendingUp },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/watchlist", label: "Watchlist", icon: Star },
    { href: "/sentiment", label: "Sentiment", icon: Activity },
  ];

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-200",
      scrolled
        ? "border-b border-border/80 bg-background/90 backdrop-blur-lg shadow-sm"
        : "border-b border-border/40 bg-background/70 backdrop-blur-sm"
    )}>
      {/* Top ticker bar */}
      <div className="border-b border-border/30 bg-muted/30 px-4 py-0.5">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <span className="text-xs text-muted-foreground font-mono">
            Colombo Stock Exchange • Real-Time Intelligence
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span>SLT (UTC+5:30)</span>
            <LiveClock />
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cse-blue to-cse-blue-light shadow-lg group-hover:shadow-cse-blue/30 transition-shadow">
              <Zap className="h-4 w-4 text-cse-gold" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-base tracking-tight text-foreground">
                CSE<span className="text-cse-gold">-Intrinsic</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">.ai</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <MarketStatusBadge isOpen={marketOpen} />

            <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
              <Link href="/search">
                <Search className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Convert to SLT (UTC+5:30)
      const slt = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      setTime(slt.toUTCString().slice(17, 25));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time} SLT</span>;
}
