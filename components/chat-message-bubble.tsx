import React from "react";
import { cn } from "@/lib/utils";
import { highlightText } from "@/lib/highlight-text";
import { Pin } from "lucide-react";

export type ChatMessage = {
  id: string;
  author: "me" | "them";
  text: string;
  time: string;
  status: "sending" | "sent" | "delivered" | "read";
  isPinned?: boolean;
};

interface ChatMessageBubbleProps {
  message: ChatMessage;
  searchQuery?: string;
  isPinned?: boolean;
  isAdmin?: boolean;
  onTogglePin?: (messageId: string) => void;
  isHighlighted?: boolean;
}

export function ChatMessageBubble({
  message,
  searchQuery = "",
  isPinned = false,
  isAdmin = false,
  onTogglePin,
  isHighlighted = false,
}: ChatMessageBubbleProps) {
  const isMe = message.author === "me";

  return (
    <div
      id={`msg-${message.id}`}
      data-message-id={message.id}
      className={cn(
        "flex flex-col max-w-[85%] sm:max-w-[72%] group relative transition-all duration-300",
        isMe ? "items-end ml-auto" : "items-start mr-auto"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 shadow-sm text-sm relative transition-all duration-300",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border/70 rounded-bl-sm",
          isHighlighted && "ring-2 ring-primary bg-primary/20 scale-[1.02]",
          isPinned && "border-primary/50 shadow-md"
        )}
      >
        {isPinned && (
          <div className="flex items-center gap-1 text-[10px] font-semibold mb-1 opacity-90 text-primary">
            <Pin className="h-3 w-3 rotate-45" />
            <span>Pinned</span>
          </div>
        )}

        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {highlightText(message.text, searchQuery)}
        </p>

        {isAdmin && onTogglePin && (
          <button
            type="button"
            onClick={() => onTogglePin(message.id)}
            title={isPinned ? "Unpin message" : "Pin message"}
            aria-label={isPinned ? "Unpin message" : "Pin message"}
            className={cn(
              "absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full border border-border bg-card text-foreground shadow-md hover:bg-muted focus:opacity-100 z-10",
              isPinned && "opacity-100 bg-primary/10 border-primary text-primary"
            )}
          >
            <Pin className="h-3 w-3 rotate-45" />
          </button>
        )}
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
