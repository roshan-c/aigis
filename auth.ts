import { readFileSync, writeFileSync } from "fs";
import { getOAuthApiKey } from "@earendil-works/pi-ai/oauth";

const AUTH_FILE = "auth.json";

export async function getCopilotApiKey(): Promise<string> {
  const auth = JSON.parse(readFileSync(AUTH_FILE, "utf-8"));
  const oauthResult = await getOAuthApiKey("github-copilot", auth);

  if (!oauthResult) {
    throw new Error("Failed to get OAuth API key");
  }

  auth["github-copilot"] = {
    type: "oauth",
    ...oauthResult.newCredentials,
  };

  writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));

  return oauthResult.apiKey;
}
