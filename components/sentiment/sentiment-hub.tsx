"use client";

import React, { useState } from "react";
import { Activity, AlertTriangle, Newspaper, Twitter, MessageCircle } from "lucide-react";
import { SentimentFeed } from "@/components/sentiment/sentiment-feed";
import { AnnouncementsPanel } from "@/components/market/announcements-panel";
import { cn } from "@/lib/utils";

export function SentimentHub() {
  const [activeTab, setActiveTab] = useState<"all" | "insider">("all");

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-cse-gold" />
          Sentiment Hub
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time social media monitoring, news sentiment, and insider activity detection
        </p>
      </div>

      {/* Source badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: "Twitter/X", icon: Twitter, color: "text-sky-400" },
          { label: "NewsData.io", icon: Newspaper, color: "text-cse-gold" },
          { label: "DailyFT RSS", icon: Newspaper, color: "text-green-400" },
          { label: "EconomyNext", icon: Newspaper, color: "text-purple-400" },
          { label: "LBO", icon: Newspaper, color: "text-orange-400" },
          { label: "Reddit", icon: MessageCircle, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/60 rounded-full px-2.5 py-1">
            <s.icon className={cn("h-3 w-3", s.color)} />
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Live sentiment feed */}
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <SentimentFeed />
        </div>

        {/* Right: Announcements + insider heatmap */}
        <div className="space-y-4">
          {/* Insider heatmap header */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="font-display font-semibold">Insider Activity Radar</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Automatically flags announcements with patterns consistent with insider trading:
              unusual volume spikes, pre-announcement price movements, and high-risk keywords.
            </p>
            <div className="flex gap-4 text-xs font-mono">
              {[
                { label: "CRITICAL", color: "bg-destructive", desc: "≥70% score" },
                { label: "HIGH", color: "bg-signal-sell", desc: "50-70%" },
                { label: "MEDIUM", color: "bg-signal-hold", desc: "30-50%" },
                { label: "LOW", color: "bg-muted", desc: "<30%" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", l.color)} />
                  <span className="text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements with insider filter */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <AnnouncementsPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
