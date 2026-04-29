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
    console.log("[Orchestrator] Debate started. rounds=", this.rounds);
    this.history = [];
    this.history.push({ speaker: "SYSTEM", text: initialPrompt, timestamp: nowISO() });

    for (let r = 0; r < this.rounds; r++) {
      for (const agent of this.agents) {
        console.log(`[Orchestrator] Round ${r + 1}/${this.rounds}: waiting for ${agent.name}`);
        const reply = await agent.reply(this.history.slice());
        this.history.push(reply);
        console.log(`[Orchestrator] ${agent.name} replied.`);
        console.log("[Orchestrator] Current conversation:");
        console.log(this.renderTranscript());
        console.log("---");
      }
    }

    // After debate, add a summary
    await this.addSummary();

    return this.history;
  }

  private async addSummary(): Promise<void> {
    // Use the last agent (moderator) to summarize
    const summarizer = this.agents[this.agents.length - 1];
    console.log(`[Orchestrator] Asking ${summarizer.name} to summarize.`);
    const summaryPrompt = "以上の議論をまとめて、合意点や残された意見を簡潔に述べてください。";
    this.history.push({ speaker: "SYSTEM", text: summaryPrompt, timestamp: nowISO() });
    const summaryReply = await summarizer.reply(this.history.slice());
    this.history.push(summaryReply);
    console.log(`[Orchestrator] Summary added by ${summarizer.name}.`);
  }

  // Simple helper to render the transcript as text
  renderTranscript(): string {
    return this.history.map((m) => `[${m.timestamp}] ${m.speaker}: ${m.text}`).join("\n");
  }
}
