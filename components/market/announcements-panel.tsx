"use client";

import React, { useEffect, useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { AlertTriangle, FileText, ExternalLink, Shield, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: number;
  cseId: string;
  symbol: string;
  title: string;
  category: string;
  subcategory?: string;
  pdfUrl?: string;
  publishedAt: string;
  isInsiderFlag: boolean;
  insiderScore: number;
  sentimentScore?: number;
}

interface AnnouncementsPanelProps {
  symbol?: string;
  showInsiderOnly?: boolean;
}

export function AnnouncementsPanel({ symbol, showInsiderOnly = false }: AnnouncementsPanelProps) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [insiderOnly, setInsiderOnly] = useState(showInsiderOnly);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "30" });
        if (symbol) params.set("symbol", symbol);
        if (insiderOnly) params.set("insiderOnly", "true");
        const res = await fetch(`/api/announcements?${params}`);
        const data = await res.json();
        setItems(data.announcements ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, [symbol, insiderOnly]);

  const insiderCount = items.filter((a) => a.isInsiderFlag).length;

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold font-display">CSE Announcements</h4>
          {insiderCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 animate-pulse">
              {insiderCount} insider flag{insiderCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button
          variant={insiderOnly ? "gold" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setInsiderOnly(!insiderOnly)}
        >
          <Shield className="h-3 w-3" />
          Insider Only
        </Button>
      </div>

      {/* Items */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-14 skeleton rounded-xl" />
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No announcements found</p>
          </div>
        ) : (
          items.map((ann) => (
            <div
              key={ann.id}
              className={cn(
                "rounded-lg border p-3 transition-all hover:bg-muted/20 group",
                ann.isInsiderFlag
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border/60 bg-card/40"
              )}
            >
              <div className="flex items-start gap-2">
                {ann.isInsiderFlag ? (
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug line-clamp-2">{ann.title}</p>
                    {ann.pdfUrl && (
                      <a
                        href={ann.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {ann.symbol && (
                      <span className="text-[10px] font-mono font-bold text-cse-gold">
                        {ann.symbol.replace(".N0000", "").replace(".X0000", "")}
                      </span>
                    )}
                    {ann.category && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {ann.category}
                      </span>
                    )}
                    {ann.isInsiderFlag && (
                      <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-semibold">
                        ⚠ Potential Insider ({(ann.insiderScore * 100).toFixed(0)}%)
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                      {timeAgo(ann.publishedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
