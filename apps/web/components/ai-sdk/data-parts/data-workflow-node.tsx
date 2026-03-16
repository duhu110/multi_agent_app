'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolOutput,
} from '@/components/ai-elements/tool';
import {
  Agent,
  AgentContent,
} from '@/components/ai-elements/agent';
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/sources';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { CheckCircle2, Loader2, AlertCircle, BotIcon, ChevronRight } from 'lucide-react';
import type { WorkflowNodeType, AgentStepInfo } from '@/lib/aisdk.types';

export interface DataWorkflowNodeProps {
  node: string;
  nodeType: WorkflowNodeType;
  label: string;
  status: 'running' | 'completed' | 'error';
  output?: Record<string, unknown>;
  errorMessage?: string;
  steps?: AgentStepInfo[];
}

function getAgentPrefix(nodeName: string): string {
  return nodeName.replace('_agent', '');
}

function extractAgentOutput(nodeName: string, output: Record<string, unknown>) {
  const prefix = getAgentPrefix(nodeName);
  return {
    text: (output[`${prefix}_output`] as string) ?? '',
    citations: (output[`${prefix}_citations`] as string[]) ?? [],
    artifacts: (output[`${prefix}_artifacts`] as Record<string, unknown>) ?? null,
  };
}

/** Renders utility nodes (load_memory, persist_memory) using the Tool component */
function UtilityNode({ node, label, status, output, errorMessage }: DataWorkflowNodeProps) {
  const toolState = status === 'completed' ? 'output-available'
    : status === 'error' ? 'output-error'
    : 'input-available';

  return (
    <Tool defaultOpen={status !== 'running'}>
      <ToolHeader
        type="dynamic-tool"
        toolName={node}
        title={label}
        state={toolState}
      />
      {status === 'running' && (
        <ToolContent>
          <Shimmer className="text-sm text-muted-foreground">{`${label}...`}</Shimmer>
        </ToolContent>
      )}
      {status === 'error' && errorMessage && (
        <ToolContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {errorMessage}
          </div>
        </ToolContent>
      )}
      {status === 'completed' && output && Object.keys(output).length > 0 && (
        <ToolContent>
          <ToolOutput
            output={output}
            errorText={undefined}
          />
        </ToolContent>
      )}
      {status === 'completed' && (!output || Object.keys(output).length === 0) && (
        <ToolContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-600" />
            <span>Completed</span>
          </div>
        </ToolContent>
      )}
    </Tool>
  );
}

/** Renders the router node using the Tool component */
function RouterNode({ label, status, output, errorMessage }: DataWorkflowNodeProps) {
  const toolState = status === 'completed' ? 'output-available'
    : status === 'error' ? 'output-error'
    : 'input-available';

  const reason = output?.router_reason as string | undefined;
  const agents = output?.selected_agents as string[] | undefined;

  return (
    <Tool defaultOpen={status !== 'running'}>
      <ToolHeader
        type="dynamic-tool"
        toolName="router"
        title={label}
        state={toolState}
      />
      {status === 'running' && (
        <ToolContent>
          <Shimmer className="text-sm text-muted-foreground">Analyzing request...</Shimmer>
        </ToolContent>
      )}
      {status === 'error' && errorMessage && (
        <ToolContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {errorMessage}
          </div>
        </ToolContent>
      )}
      {status === 'completed' && (
        <ToolContent>
          {reason && (
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Reason
              </h4>
              <p className="text-sm text-foreground">{reason}</p>
            </div>
          )}
          {agents && agents.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Selected Agents
              </h4>
              <div className="flex flex-wrap gap-2">
                {agents.map((agent) => (
                  <Badge key={agent} variant="secondary" className="text-xs">
                    {agent}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </ToolContent>
      )}
    </Tool>
  );
}

/** Step progress indicator for agent subgraph */
function AgentSteps({ steps }: { steps: AgentStepInfo[] }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {steps.map((step, idx) => (
        <div key={step.name} className="flex items-center gap-1.5">
          {idx > 0 && <span className="text-muted-foreground/40">&rarr;</span>}
          <div className="flex items-center gap-1">
            {step.status === 'completed' && (
              <CheckCircle2 className="size-3 text-green-600" />
            )}
            {step.status === 'running' && (
              <Loader2 className="size-3 animate-spin text-amber-500" />
            )}
            {step.status === 'pending' && (
              <div className="size-3 rounded-full border border-muted-foreground/30" />
            )}
            <span className={step.status === 'running' ? 'text-foreground font-medium' : ''}>
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Renders agent nodes with collapsible content */
function AgentNode({ node, label, status, output, errorMessage, steps }: DataWorkflowNodeProps) {
  const agentData = output ? extractAgentOutput(node, output) : null;
  // Running agents default open; completed agents default collapsed
  const [open, setOpen] = useState(status !== 'completed');

  return (
    <Agent>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/30 transition-colors rounded-t-md"
          >
            <div className="flex items-center gap-2 min-w-0">
              <BotIcon className="size-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate">{label}</span>
              {status === 'running' && steps && steps.length > 0 && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  {steps.find(s => s.status === 'running')?.label ?? ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {status === 'running' && (
                <Loader2 className="size-3.5 animate-spin text-amber-500" />
              )}
              {status === 'completed' && (
                <CheckCircle2 className="size-3.5 text-green-600" />
              )}
              {status === 'error' && (
                <AlertCircle className="size-3.5 text-destructive" />
              )}
              <ChevronRight className={`size-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AgentContent>
            {status === 'running' && (
              <div className="space-y-2">
                {steps && steps.length > 0 ? (
                  <AgentSteps steps={steps} />
                ) : (
                  <Shimmer className="text-sm text-muted-foreground">Thinking...</Shimmer>
                )}
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4" />
                {errorMessage ?? 'An error occurred'}
              </div>
            )}
            {status === 'completed' && agentData && (
              <>
                {steps && steps.length > 0 && (
                  <AgentSteps steps={steps} />
                )}
                {agentData.text && (
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {agentData.text}
                  </div>
                )}
                {agentData.citations.length > 0 && (
                  <Sources>
                    <SourcesTrigger count={agentData.citations.length} />
                    <SourcesContent>
                      {agentData.citations.map((citation) => (
                        <Source key={citation} title={citation} />
                      ))}
                    </SourcesContent>
                  </Sources>
                )}
                {agentData.artifacts && Object.keys(agentData.artifacts).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Artifacts
                    </h4>
                    <div className="rounded-md bg-muted/50">
                      <CodeBlock
                        code={JSON.stringify(agentData.artifacts, null, 2)}
                        language="json"
                      />
                    </div>
                  </div>
                )}
                {!agentData.text && agentData.citations.length === 0 && !steps && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-green-600" />
                    <span>Completed</span>
                  </div>
                )}
              </>
            )}
          </AgentContent>
        </CollapsibleContent>
      </Collapsible>
    </Agent>
  );
}

/** Renders the collect_results node as a lightweight status indicator */
function CollectorNode({ label, status, errorMessage }: DataWorkflowNodeProps) {
  return (
    <div className="flex items-center gap-2 py-2 text-sm">
      {status === 'running' && (
        <>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">{label}...</span>
        </>
      )}
      {status === 'completed' && (
        <>
          <CheckCircle2 className="size-4 text-green-600" />
          <span className="text-muted-foreground">{label}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="size-4 text-destructive" />
          <span className="text-destructive">{errorMessage ?? label}</span>
        </>
      )}
    </div>
  );
}

/** Renders the synthesize node - shows shimmer when running, hidden when completed */
function SynthesizerNode({ status, errorMessage }: DataWorkflowNodeProps) {
  if (status === 'completed') return null;

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-destructive">
        <AlertCircle className="size-4" />
        {errorMessage ?? 'Synthesis failed'}
      </div>
    );
  }

  return (
    <div className="py-2">
      <Shimmer className="text-sm text-muted-foreground">Synthesizing final answer...</Shimmer>
    </div>
  );
}

export function DataWorkflowNode(props: DataWorkflowNodeProps) {
  switch (props.nodeType) {
    case 'utility':
      return <UtilityNode {...props} />;
    case 'router':
      return <RouterNode {...props} />;
    case 'agent':
      return <AgentNode {...props} />;
    case 'collector':
      return <CollectorNode {...props} />;
    case 'synthesizer':
      return <SynthesizerNode {...props} />;
    default:
      return null;
  }
}
