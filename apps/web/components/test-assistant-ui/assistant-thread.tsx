"use client";

import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
} from "@assistant-ui/react";
import { BotIcon, ArrowUpIcon } from "lucide-react";
import { type FC } from "react";

/* ------------------------------------------------------------------ */
/*  Sub-components for message rendering                               */
/* ------------------------------------------------------------------ */

const UserText: FC = () => (
  <MessagePartPrimitive.Text
    className="whitespace-pre-wrap"
    smooth={false}
  />
);

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="flex w-full max-w-[95%] flex-col gap-2 ml-auto justify-end">
    <div className="ml-auto w-fit max-w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground">
      <MessagePrimitive.Content components={{ Text: UserText }} />
    </div>
  </MessagePrimitive.Root>
);

const AssistantText: FC = () => (
  <>
    <MessagePartPrimitive.Text
      className="whitespace-pre-wrap"
      smooth
    />
    <MessagePartPrimitive.InProgress>
      <span className="ml-1 inline-flex items-center gap-1">
        <span className="size-1.5 animate-pulse rounded-full bg-foreground/50" />
        <span className="size-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:300ms]" />
      </span>
    </MessagePartPrimitive.InProgress>
  </>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="flex w-full max-w-[95%] flex-col gap-2">
    <div className="w-fit max-w-full text-sm text-foreground">
      <MessagePrimitive.Content components={{ Text: AssistantText }} />
    </div>
  </MessagePrimitive.Root>
);

/* ------------------------------------------------------------------ */
/*  Main Thread component                                              */
/* ------------------------------------------------------------------ */

type AssistantThreadProps = {
  error?: string;
};

export function AssistantThread({ error }: AssistantThreadProps) {
  return (
    <section className="flex h-full min-h-0 flex-col border-x">
      <header className="border-b px-4 py-3">
        <h2 className="font-semibold">assistant-ui chat</h2>
        <p className="text-muted-foreground text-xs">
          Powered by @assistant-ui/react + LangGraph SSE adapter.
        </p>
      </header>

      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ThreadPrimitive.Empty>
            <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="text-muted-foreground">
                <BotIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Ready to test</h3>
                <p className="text-muted-foreground text-sm">
                  Send your first message to begin a LangGraph run.
                </p>
              </div>
            </div>
          </ThreadPrimitive.Empty>

          <div className="flex flex-col gap-8 p-4">
            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                AssistantMessage,
              }}
            />
          </div>
        </ThreadPrimitive.Viewport>

        <ThreadPrimitive.ViewportFooter className="relative">
          <ThreadPrimitive.ScrollToBottom className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-full border bg-background p-2 shadow-sm hover:bg-muted" />
        </ThreadPrimitive.ViewportFooter>

        <footer className="space-y-2 border-t p-3">
          <ComposerPrimitive.Root className="flex flex-col gap-2">
            <ComposerPrimitive.Input
              submitMode="ctrlEnter"
              placeholder="Ask something... (Ctrl/Cmd + Enter to send)"
              rows={3}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center justify-end gap-2">
              <ComposerPrimitive.Send className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                <ArrowUpIcon className="size-4" />
                Send
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
          {error ? (
            <p className="text-destructive text-xs">{error}</p>
          ) : null}
        </footer>
      </ThreadPrimitive.Root>
    </section>
  );
}
