"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingControl } from "./RatingControl";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RichCodeBlock from "@/components/RichCodeBlock";
import type { ParsedResponse } from "@/app/utils/responseParser";

interface ResponseCardProps {
  title: string;
  parsedResponse: ParsedResponse | null;
  scores: {
    overall: number;
  };
  onScoreChange: (dimension: string, value: number) => void;
  onFlag?: () => void;
  isFlagged?: boolean;
  className?: string;
}

export const ResponseCard: React.FC<ResponseCardProps> = ({
  title,
  parsedResponse,
  scores,
  onScoreChange,
  onFlag,
  isFlagged = false,
  className,
}) => {
  const dimensions = [{ key: "overall", label: "Overall Rating" }];

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {onFlag && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFlag}
              className={cn(
                "h-8 w-8 p-0",
                isFlagged && "text-red-500 hover:text-red-600"
              )}
            >
              <Flag className={cn("h-4 w-4", isFlagged && "fill-current")} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Response Content */}
        <div className="flex-1 overflow-auto">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {parsedResponse ? (
              <div className="space-y-4">
                {/* Main content */}
                {parsedResponse.content && (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {parsedResponse.content}
                  </div>
                )}

                {/* Code block */}
                {parsedResponse.rawCode && (
                  <RichCodeBlock
                    code={parsedResponse.rawCode}
                    title={parsedResponse.codeTitle}
                    language="python"
                  />
                )}

                {/* Post-code content */}
                {parsedResponse.postCodeContent && (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed mt-4">
                    {parsedResponse.postCodeContent}
                  </div>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4 border">
                Loading response...
              </div>
            )}
          </div>
        </div>

        {/* Rating Controls */}
        <div className="space-y-1 border-t pt-4">
          <h4 className="text-sm font-semibold mb-3 text-foreground">
            Rate this response
          </h4>
          {dimensions.map((dimension) => (
            <RatingControl
              key={dimension.key}
              label={dimension.label}
              value={scores[dimension.key as keyof typeof scores]}
              onChange={(value) => onScoreChange(dimension.key, value)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
