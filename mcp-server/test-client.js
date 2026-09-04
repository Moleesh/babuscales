// Manual smoke test — spins up server.js as a real MCP client would and
// exercises every tool once. Not wired into CI; run with `npm test` when
// touching server.js.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: "node", args: ["server.js"] });
const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log(
  "=== Tools advertised ===\n",
  tools.tools.map((t) => t.name).join(", ")
);

const call = async (name, args = {}) => {
  console.log(`\n=== ${name}(${JSON.stringify(args)}) ===`);
  const result = await client.callTool({ name, arguments: args });
  console.log(result.content[0].text);
};

await call("dashboard_summary");
const { docId } = JSON.parse((await client.callTool({ name: "list_tickets", arguments: { limit: 1 } })).content[0].text)[0];
await call("get_ticket", { doc_id: docId });
await call("list_tickets", { limit: 3 });
await call("list_masters", { limit: 5 });

await client.close();
process.exit(0);
