import { MockAgent } from "../src/copilotAdapter.js";
import { Orchestrator } from "../src/orchestrator.js";

test("orchestrator runs mock agents for configured rounds", async () => {
  const agents = [
    new MockAgent("a1", "A", "role1"),
    new MockAgent("a2", "B", "role2"),
  ];
  const orch = new Orchestrator(agents, { rounds: 2 });
  const history = await orch.run("議題テスト");

  // initial system + 2 rounds * 2 agents = 1 + 4 entries
  expect(history.length).toBe(1 + 2 * agents.length);
  expect(history[0].speaker).toBe("SYSTEM");
  // last entry should be from last agent
  expect(history[history.length - 1].speaker).toBe("B");
});
