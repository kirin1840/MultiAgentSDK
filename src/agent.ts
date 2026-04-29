export type Message = {
  speaker: string;
  text: string;
  timestamp: string;
};

export interface Agent {
  id: string;
  name: string;
  role?: string;
  model?: string;
  /**
   * Given the conversation history, produce the next message.
   * Implementations may call external LLM or SDKs.
   */
  reply(history: Message[], context?: Record<string, unknown>): Promise<Message>;
}

export function nowISO() {
  return new Date().toISOString();
}
