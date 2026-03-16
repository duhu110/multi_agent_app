import { UIMessage } from 'ai';

/**
 * Progress updates during long-running operations.
 * Emitted by the analyze_data tool.
 */
export interface ProgressData {
  type: 'progress';
  id: string;
  step: string;
  message: string;
  progress: number;
  totalSteps: number;
  currentStep: number;
}

/**
 * Status updates for operation completion.
 * Emitted when an operation finishes.
 */
export interface StatusData {
  type: 'status';
  id: string;
  status: 'complete' | 'pending' | 'error';
  message: string;
}

/**
 * File operation status updates.
 * Emitted by the process_file tool.
 */
export interface FileStatusData {
  type: 'file-status';
  id: string;
  filename: string;
  operation: 'read' | 'compress' | 'validate' | 'transform';
  status: 'started' | 'completed' | 'error';
  size?: string;
}

/**
 * Workflow node execution data.
 * Emitted for each step in the multi-agent pipeline.
 */
export type WorkflowNodeType = 'utility' | 'router' | 'agent' | 'collector' | 'synthesizer';

export interface AgentStepInfo {
  name: string;
  label: string;
  status: 'pending' | 'running' | 'completed';
}

export interface WorkflowNodeData {
  node: string;
  nodeType: WorkflowNodeType;
  label: string;
  status: 'running' | 'completed' | 'error';
  output?: Record<string, unknown>;
  errorMessage?: string;
  steps?: AgentStepInfo[];
}

export const WORKFLOW_NODE_CONFIG: Record<string, {
  nodeType: WorkflowNodeType;
  label: string;
}> = {
  load_memory:     { nodeType: 'utility',      label: 'Load Memory' },
  router:          { nodeType: 'router',        label: 'Route Decision' },
  sql_agent:       { nodeType: 'agent',         label: 'SQL Agent' },
  rag_agent:       { nodeType: 'agent',         label: 'RAG Agent' },
  web_agent:       { nodeType: 'agent',         label: 'Web Agent' },
  action_agent:    { nodeType: 'agent',         label: 'Action Agent' },
  chat_agent:      { nodeType: 'agent',         label: 'Chat Agent' },
  collect_results: { nodeType: 'collector',     label: 'Collect Results' },
  synthesize:      { nodeType: 'synthesizer',   label: 'Synthesize' },
  persist_memory:  { nodeType: 'utility',       label: 'Persist Memory' },
};

/** Internal subgraph steps for each agent node */
export const AGENT_STEPS: Record<string, { name: string; label: string }[]> = {
  sql_agent: [
    { name: 'plan', label: 'Planning SQL' },
    { name: 'execute', label: 'Executing Query' },
    { name: 'respond', label: 'Generating Response' },
  ],
  rag_agent: [
    { name: 'plan', label: 'Planning Retrieval' },
    { name: 'retrieve', label: 'Retrieving Documents' },
    { name: 'respond', label: 'Generating Response' },
  ],
  web_agent: [
    { name: 'plan', label: 'Planning Search' },
    { name: 'search', label: 'Searching Web' },
    { name: 'respond', label: 'Generating Response' },
  ],
  action_agent: [
    { name: 'plan', label: 'Planning Action' },
    { name: 'execute', label: 'Executing Action' },
    { name: 'respond', label: 'Generating Response' },
  ],
};

/**
 * Custom data types emitted by the agent's tools.
 * These map to data-{type} parts in the UI stream.
 */
export type CustomDataTypes = {
  progress: ProgressData;
  status: StatusData;
  'file-status': FileStatusData;
  'workflow-node': WorkflowNodeData;
};

/**
 * Tool definitions matching the LangGraph agent's tools.
 * This provides type-safe tool invocations in the UI.
 */
export type AgentTools = {
  analyze_data: {
    input: {
      dataSource: 'sales' | 'inventory' | 'customers' | 'transactions';
      analysisType: 'trends' | 'anomalies' | 'correlations' | 'summary';
    };
    output: string;
  };

  process_file: {
    input: {
      filename: string;
      operation: 'read' | 'compress' | 'validate' | 'transform';
    };
    output: string;
  };
};

/**
 * Fully typed UIMessage for the custom-data agent.
 * Includes custom data types and tool types.
 */
export type CustomDataMessage = UIMessage<unknown, CustomDataTypes, AgentTools>;