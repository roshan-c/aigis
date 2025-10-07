import { tool } from "ai";
import { z } from "zod";

export const getWeather = tool({
  description:
    "Get current weather for a city. Prefer metric units unless asked otherwise.",
  inputSchema: z.object({
    city: z.string().describe('City name, e.g. "San Francisco"'),
    unit: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
  }),

  /* simulated tool implementation
  in a real implementation, you'd call a weather API here
  for this demonstration, we return a fixed response */
  execute: async ({ city, unit }) => {
    const tempC = 18 + Math.floor(Math.random() * 7) - 3;
    const temperature =
      unit === "fahrenheit" ? Math.round((tempC * 9) / 5 + 32) : tempC;
    return {
      city,
      unit,
      temperature,
      conditions: ["Sunny", "Cloudy", "Windy", "Showers"][
        Math.floor(Math.random() * 4)
      ],
      source: "sim-weather",
    };
  },
});
