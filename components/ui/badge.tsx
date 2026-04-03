import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        gold: "border-cse-gold/30 bg-cse-gold/15 text-cse-gold",
        "strong-buy": "border-signal-strong-buy/30 bg-signal-strong-buy/15 text-signal-strong-buy",
        buy: "border-signal-buy/30 bg-signal-buy/15 text-signal-buy",
        hold: "border-signal-hold/30 bg-signal-hold/15 text-signal-hold",
        sell: "border-signal-sell/30 bg-signal-sell/15 text-signal-sell",
        "strong-sell": "border-signal-strong-sell/30 bg-signal-strong-sell/15 text-signal-strong-sell",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
