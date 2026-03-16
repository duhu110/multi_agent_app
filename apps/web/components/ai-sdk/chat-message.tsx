'use client';

import {
  isDataUIPart,
  isTextUIPart,
  isReasoningUIPart,
  isFileUIPart,
  isToolUIPart,
} from 'ai';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, File, ToolInvocation } from './message-parts';
import { DataProgress, DataStatus, DataFileStatus, DataWorkflowNode } from './data-parts';
import { type CustomDataMessage } from '@/lib/aisdk.types';

interface ChatMessageProps {
  message: CustomDataMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Separate workflow data-parts from other parts
  const workflowParts: { index: number; data: any; id?: string }[] = [];
  const contentParts: { index: number; part: any }[] = [];

  message.parts.forEach((part, i) => {
    if (
      !isUser &&
      isDataUIPart(part) &&
      part.type === 'data-workflow-node'
    ) {
      workflowParts.push({
        index: i,
        data: part.data as any,
        id: (part as any).id,
      });
    } else {
      contentParts.push({ index: i, part });
    }
  });

  // Check if there are any non-workflow content parts to render in a bubble
  const hasContent = contentParts.some(({ part }) =>
    isTextUIPart(part) ||
    isReasoningUIPart(part) ||
    isFileUIPart(part) ||
    isToolUIPart(part) ||
    isDataUIPart(part)
  );

  return (
    <Message from={message.role}>
      {/* Workflow nodes rendered outside MessageContent (full-width) */}
      {workflowParts.map(({ data, id, index }) => (
        <DataWorkflowNode
          key={id ?? index}
          node={data.node}
          nodeType={data.nodeType}
          label={data.label}
          status={data.status}
          output={data.output}
          errorMessage={data.errorMessage}
          steps={data.steps}
        />
      ))}

      {/* Regular content parts inside MessageContent bubble */}
      {hasContent && (
        <MessageContent>
          {contentParts.map(({ index, part }) => {
            if (isReasoningUIPart(part)) {
              return (
                <Reasoning
                  key={index}
                  text={part.text}
                  state={part.state || 'done'}
                />
              );
            }

            if (isTextUIPart(part)) {
              return <MessageResponse key={index}>{part.text}</MessageResponse>;
            }

            if (isFileUIPart(part)) {
              return <File key={index} url={part.url} mediaType={part.mediaType} />;
            }

            if (isToolUIPart(part)) {
              const toolName =
                'toolName' in part
                  ? part.toolName
                  : part.type.replace('tool-', '');
              const input = 'input' in part ? part.input : undefined;
              const output = 'output' in part ? part.output : undefined;
              return (
                <ToolInvocation
                  key={index}
                  toolName={toolName}
                  input={input}
                  output={output}
                />
              );
            }

            if (isDataUIPart(part)) {
              const d = part.data as any;
              if (part.type === 'data-progress') {
                return (
                  <DataProgress
                    key={index}
                    step={d.step}
                    message={d.message}
                    progress={d.progress}
                    currentStep={d.currentStep}
                    totalSteps={d.totalSteps}
                  />
                );
              }
              if (part.type === 'data-status') {
                return (
                  <DataStatus
                    key={index}
                    status={d.status}
                    message={d.message}
                  />
                );
              }
              if (part.type === 'data-file-status') {
                return (
                  <DataFileStatus
                    key={index}
                    filename={d.filename}
                    operation={d.operation}
                    status={d.status}
                    size={d.size}
                  />
                );
              }
              return null;
            }

            return null;
          })}
        </MessageContent>
      )}
    </Message>
  );
}
