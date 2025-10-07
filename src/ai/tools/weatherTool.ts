import { tool } from "ai";
import { z } from "zod";

export const weatherTool = tool({
  description: "Get the weather in a location (in Fahrenheit)",
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    // Mocked Fahrenheit temperature
    const temperature = 72 + Math.floor(Math.random() * 21) - 10;
    return { location, temperature };
  },
});

export type WeatherToolInput = z.infer<typeof weatherTool.inputSchema>;
