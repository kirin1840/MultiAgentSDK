import { Agent, Message, nowISO } from "./agent.js";

/**
 * CopilotAgent: a thin wrapper around @github/copilot-sdk.
 *
 * Behavior:
 * - Reuses a singleton CopilotClient to avoid spawning multiple CLI processes.
 * - Creates one session per agent and reuses it across replies.
 * - Uses `sendAndWait` for a simple synchronous reply pattern.
 *
 * Authentication/Options (in priority order):
 * 1. BYOK (Bring Your Own Key): If COPILOT_PROVIDER_TYPE, COPILOT_PROVIDER_URL, and COPILOT_PROVIDER_KEY are set,
 *    use a custom OpenAI-compatible or Azure provider.
 * 2. Copilot CLI: If available and COPILOT_GITHUB_TOKEN env var is set or user is logged in.
 *
 * Environment variables:
 * - COPILOT_PROVIDER_TYPE: "openai", "azure", or unset (for Copilot CLI)
 * - COPILOT_PROVIDER_URL: API endpoint (e.g., https://api.openai.com/v1)
 * - COPILOT_PROVIDER_KEY: API key for the provider
 * - COPILOT_MODEL: Model name (e.g., gpt-4, gpt-3.5-turbo; required for BYOK)
 * - COPILOT_GITHUB_TOKEN: GitHub token for Copilot CLI auth
 */

export class CopilotAgent implements Agent {
  id: string;
  name: string;
  role?: string;

  // Shared client for all CopilotAgent instances
  private static client: any | undefined;

  // Each agent holds its own session so the SDK can track context per agent
  private session: any | undefined;

  constructor(id: string, name: string, role?: string) {
    this.id = id;
    this.name = name;
    this.role = role;
  }

  private static async ensureClient(): Promise<any> {
    if (!CopilotAgent.client) {
      // Use dynamic import to avoid ESM/CJS resolution errors when the SDK
      // package only exports ESM. This lets the module be present but only
      // loaded when a CopilotAgent is actually used.
      const sdk: any = await import("@github/copilot-sdk");
      const CopilotClientCtor = sdk.CopilotClient;
      CopilotAgent.client = new CopilotClientCtor({ autoStart: true, githubToken: process.env.COPILOT_GITHUB_TOKEN });
      await CopilotAgent.client.start();
    }
    return CopilotAgent.client as any;
  }

  private buildPrompt(history: Message[]): string {
    // Simple prompt builder: include recent history and agent role
    const roleHint = this.role ? `あなたの役割: ${this.role}\n` : "";
    const convo = history.map((m) => `${m.speaker}: ${m.text}`).join("\n");
    return `${roleHint}${convo}\n${this.name}として次に一言で応答してください:`;
  }

  async reply(history: Message[]): Promise<Message> {
    const client = await CopilotAgent.ensureClient();

    if (!this.session) {
      // Create a new session for this agent; systemMessage can embed the role
      // `onPermissionRequest` is required by the SDK types; provide a simple
      // handler that allows tool permissions by default. Adapt this for stricter
      // policies in production.
      this.session = await client.createSession({
        model: process.env.COPILOT_MODEL || "gpt-5-mini",
        systemMessage: {
          content: `You are an agent named ${this.name}. Role: ${this.role || "participant"}`,
        },
        streaming: false,
        onPermissionRequest: async (_request: any) => {
          return { permissionDecision: "allow" } as any;
        },
      });
    }

    const prompt = this.buildPrompt(history);
    // sendAndWait waits until the assistant finishes and returns the final event
    const assistantEvent = await this.session.sendAndWait({ prompt }, 120000);

    const text = assistantEvent?.data?.content ?? "(no response)";
    return { speaker: this.name, text, timestamp: nowISO() };
  }

  /**
   * Optional: dispose this agent's session. The client remains shared.
   */
  async dispose(): Promise<void> {
    if (this.session) {
      try {
        await this.session.destroy();
      } catch (e) {
        // ignore
      }
      this.session = undefined;
    }
  }
}

/**
 * A simple mock agent used for local demos and tests.
 * It generates predictable replies so the orchestrator can be verified.
 */
export class MockAgent implements Agent {
  id: string;
  name: string;
  role?: string;
  private counter = 0;

  constructor(id: string, name: string, role?: string) {
    this.id = id;
    this.name = name;
    this.role = role;
  }

  async reply(history: Message[]): Promise<Message> {
    this.counter++;
    const text = `(${this.name}) 回答${this.counter} — ここはモック応答です。役割: ${this.role || "(なし)"}`;
    return { speaker: this.name, text, timestamp: nowISO() };
  }
}
