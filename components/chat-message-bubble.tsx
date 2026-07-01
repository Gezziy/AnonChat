import React from "react";
import { cn } from "@/lib/utils";
import { highlightText } from "@/lib/highlight-text";

export type ChatMessage = {
  id: string;
  author: "me" | "them";
  text: string;
  time: string;
  status: "sending" | "sent" | "delivered" | "read";
};

interface ChatMessageBubbleProps {
  message: ChatMessage;
  searchQuery?: string;
}

export function ChatMessageBubble({ message, searchQuery = "" }: ChatMessageBubbleProps) {
  const isMe = message.author === "me";

  return (
    <div
      className={cn(
        "flex flex-col max-w-[85%] sm:max-w-[72%]",
        isMe ? "items-end ml-auto" : "items-start mr-auto"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 shadow-sm text-sm",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border/70 rounded-bl-sm"
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {highlightText(message.text, searchQuery)}
        </p>
      </div>
      
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>{message.time}</span>
        {isMe && (
          <span>{message.status === "sending" ? "..." : "✓✓"}</span>
        )}
      </div>
    </div>
  );
}
