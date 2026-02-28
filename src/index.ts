import { CopilotAgent } from "./copilotAdapter.js";
import { Orchestrator } from "./orchestrator.js";

async function main() {
  console.log("Multi-Agent Debate Demo (Copilot SDK)");

  const agents = [
    new CopilotAgent("a1", "Alice", "提案者"),
    new CopilotAgent("a2", "Bob", "反対者"),
    new CopilotAgent("a3", "Carol", "調停者"),
  ];

  const orch = new Orchestrator(agents, { rounds: 1 });
  const initial = "議題: 都市での自転車レーンを増やすべきか? 各自の立場から議論してください。";

  const history = await orch.run(initial);
  console.log("\n--- 議論の書き起こし ---\n");
  console.log(orch.renderTranscript());
}

main().catch((err) => {
  console.error(err);
  // Throw so the error is visible to the runtime/CI. Avoid using `process` types
  // to keep this demo free of extra @types/node dev deps.
  throw err;
});
