"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PreferenceSelectProps {
  value: "A" | "B" | "tie" | "both_bad" | null;
  onChange: (value: "A" | "B" | "tie" | "both_bad") => void;
  leftLabel: string;
  rightLabel: string;
}

export const PreferenceSelect: React.FC<PreferenceSelectProps> = ({
  value,
  onChange,
  leftLabel,
  rightLabel,
}) => {
  const options = [
    { value: "left", label: `${leftLabel} is better`, displayValue: leftLabel },
    {
      value: "right",
      label: `${rightLabel} is better`,
      displayValue: rightLabel,
    },
    { value: "tie", label: "Both are equal" },
    { value: "both_bad", label: "Both are poor" },
  ];

  const handleChange = (optionValue: string) => {
    if (optionValue === "left") {
      onChange(leftLabel as "A" | "B");
    } else if (optionValue === "right") {
      onChange(rightLabel as "A" | "B");
    } else {
      onChange(optionValue as "tie" | "both_bad");
    }
  };

  const getSelectedValue = () => {
    if (!value) return null;
    if (value === leftLabel) return "left";
    if (value === rightLabel) return "right";
    return value;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">
        Overall Preference
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = getSelectedValue() === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange(option.value)}
              className={cn(
                "px-4 py-3 rounded-lg border-2 transition-all duration-200",
                "text-sm font-medium text-center",
                "hover:border-primary/50 hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
