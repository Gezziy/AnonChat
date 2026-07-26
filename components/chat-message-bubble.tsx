import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { highlightText } from "@/lib/highlight-text";

export type Reaction = {
  emoji: string;
  userIds: string[];
};

export type ChatMessage = {
  id: string;
  author: "me" | "them";
  text: string;
  time: string;
  status: "sending" | "sent" | "delivered" | "read";
  reactions?: Reaction[];
};

interface ChatMessageBubbleProps {
  message: ChatMessage;
  searchQuery?: string;
  currentUserId?: string;
  onReact?: (messageId: string, emoji: string) => void;
}

// A lightweight set of emojis for quick reactions
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export function ChatMessageBubble({
  message,
  searchQuery = "",
  currentUserId = "me", // Default to "me" for local testing
  onReact,
}: ChatMessageBubbleProps) {
  const isMe = message.author === "me";
  const [showPicker, setShowPicker] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowPicker(false);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col max-w-[85%] sm:max-w-[72%]",
        isMe ? "items-end ml-auto" : "items-start mr-auto"
      )}
    >
      {/* Emoji Picker (Hover effect) */}
      <div
        className={cn(
          "absolute -top-10 z-10 flex items-center gap-0.5 p-1 bg-popover border border-border rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          isMe ? "right-2" : "left-2"
        )}
      >
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="p-1 hover:bg-muted rounded-full text-sm transition-transform hover:scale-125"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message Bubble */}
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

      {/* Reactions Display */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {message.reactions.map((reaction) => {
            const hasReacted = reaction.userIds.includes(currentUserId);
            return (
              <button
                key={reaction.emoji}
                onClick={() => handleEmojiClick(reaction.emoji)}
                className={cn(
                  "flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-colors",
                  hasReacted
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-card border-border hover:bg-muted"
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.userIds.length}</span>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Timestamp & Status */}
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>{message.time}</span>
        {isMe && (
          <span>{message.status === "sending" ? "..." : "✓✓"}</span>
        )}
      </div>
    </div>
  );
}