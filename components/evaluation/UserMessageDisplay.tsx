"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, MessageSquare } from "lucide-react";

interface UserMessageDisplayProps {
  content: string;
  codeContent?: string;
  codeLanguage?: string;
}

export const UserMessageDisplay: React.FC<UserMessageDisplayProps> = ({
  content,
  codeContent,
  codeLanguage,
}) => {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 mt-1">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              User Question
            </h3>
            <p className="text-base leading-relaxed">{content}</p>

            {codeContent && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code2 className="w-4 h-4" />
                  <span>
                    Code Context {codeLanguage && `(${codeLanguage})`}
                  </span>
                </div>
                <pre className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm">{codeContent}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
