'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMemo } from 'react';
import { AlertCircle, MessageCircle, Sparkles } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import { ChatMessage } from '@/components/ai-sdk/chat-message';
import { type CustomDataMessage } from '@/lib/aisdk.types';

const SUGGESTIONS = [
  'What is LangGraph?',
  'Explain state machines',
  'How do agents work?',
  'Count sales over 100k last month',
];

export default function LangGraphChat() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat' }),
    [],
  );

  const { messages, sendMessage, status, error, stop } =
    useChat<CustomDataMessage>({ transport });

  return (
    <main className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b p-4">
        <h1 className="text-lg font-semibold">Multi-Agent Workflow</h1>
        <p className="text-xs text-muted-foreground">
          LangGraph StateGraph with router, sub-agents, and synthesizer
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error.message}
        </div>
      )}

      {/* Chat area */}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600/20 to-yellow-500/20">
                <MessageCircle className="size-8 text-amber-400" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-lg font-medium">Start a conversation</h3>
              <p className="mb-6 max-w-xs text-sm text-muted-foreground">
                Send a message to begin chatting with the AI assistant.
              </p>
              <div className="flex w-full max-w-md flex-col gap-2">
                <div className="mb-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="size-3 text-amber-500" />
                  <span>Try an example</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage({ text: s })}
                      className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />

        {/* Input */}
        <div className="border-t p-3">
          <PromptInput
            onSubmit={(msg) => sendMessage({ text: msg.text })}
          >
            <PromptInputTextarea placeholder="Ask anything..." />
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </Conversation>
    </main>
  );
}
