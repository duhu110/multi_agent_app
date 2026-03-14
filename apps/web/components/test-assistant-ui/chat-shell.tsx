"use client";

import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BotIcon } from "lucide-react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
};

type ChatShellProps = {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isRunning: boolean;
  error?: string;
  messages: ChatMessage[];
};

export function ChatShell({ input, setInput, onSend, isRunning, error, messages }: ChatShellProps) {
  return (
    <section className="flex h-full min-h-0 flex-col border-x">
      <header className="border-b px-4 py-3">
        <h2 className="font-semibold">assistant-ui chat</h2>
        <p className="text-muted-foreground text-xs">Streaming with LangGraph raw SSE + adapter normalization.</p>
      </header>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<BotIcon className="size-5" />}
              title="Ready to test"
              description="Send your first message to begin a LangGraph run."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role === "tool" ? "assistant" : message.role}>
                <MessageContent>{message.role === "tool" ? `🛠 ${message.content}` : message.content}</MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <footer className="space-y-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask something... (Ctrl/Cmd + Enter to send)"
          rows={3}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">{isRunning ? "Running..." : "Idle"}</span>
          <Button onClick={onSend} disabled={isRunning || !input.trim()}>
            {isRunning ? "Running" : "Send"}
          </Button>
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </footer>
    </section>
  );
}
