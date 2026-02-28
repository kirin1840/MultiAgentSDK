import { Agent, Message, nowISO } from "./agent.js";

export type OrchestratorOptions = {
  rounds?: number; // how many turns each agent gets
};

export class Orchestrator {
  agents: Agent[];
  history: Message[] = [];
  rounds: number;

  constructor(agents: Agent[], opts?: OrchestratorOptions) {
    this.agents = agents;
    this.rounds = opts?.rounds ?? 2;
  }

  async run(initialPrompt: string): Promise<Message[]> {
    this.history = [];
    this.history.push({ speaker: "SYSTEM", text: initialPrompt, timestamp: nowISO() });

    for (let r = 0; r < this.rounds; r++) {
      for (const agent of this.agents) {
        // Each agent replies based on full history so far
        const reply = await agent.reply(this.history.slice());
        this.history.push(reply);
      }
    }

    return this.history;
  }

  // Simple helper to render the transcript as text
  renderTranscript(): string {
    return this.history.map((m) => `[${m.timestamp}] ${m.speaker}: ${m.text}`).join("\n");
  }
}
