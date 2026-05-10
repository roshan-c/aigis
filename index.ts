import { runAgent } from "./agent.ts";
import { getCopilotApiKey } from "./auth.ts";
import { createContext } from "./context.ts";

const apiKey = await getCopilotApiKey();
const context = createContext();

await runAgent(context, apiKey);
