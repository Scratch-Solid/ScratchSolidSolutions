"use client";

import { Lightbulb } from "lucide-react";

type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; text: string };

export default function LessonReader({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h3 key={index} className="text-base font-semibold text-foreground pt-2 first:pt-0">
              {block.text}
            </h3>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <p key={index} className="text-sm leading-relaxed text-muted-foreground">
              {block.text}
            </p>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={index} className="space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        // callout
        return (
          <div key={index} className="flex gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3.5">
            <Lightbulb className="h-4 w-4 shrink-0 text-accent-foreground mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{block.text}</p>
          </div>
        );
      })}
    </div>
  );
}
