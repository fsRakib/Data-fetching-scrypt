"use client";

import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const RatingControl: React.FC<RatingControlProps> = ({
  label,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
        {label}
      </span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => !disabled && onChange(rating)}
            disabled={disabled}
            className={cn(
              "transition-all duration-200 hover:scale-110 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
            )}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                rating <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-gray-300 hover:text-yellow-200"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
};
