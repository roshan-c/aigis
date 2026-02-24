import { readFile } from "node:fs/promises";
import { tool } from "ai";
import { z } from "zod";

import { stripFrontmatter } from "../skills/skills";
import type { SkillMetadata } from "../skills/skills";

export function createLoadSkillTool(skills: SkillMetadata[]) {
  const skillsByName = new Map(
    skills.map((skill) => [skill.name.toLowerCase(), skill]),
  );

  return tool({
    description: "Load a SKILL.md file to get specialized instructions.",
    inputSchema: z.object({
      name: z.string().describe("The skill name to load"),
    }),
    execute: async ({ name }) => {
      const skill = skillsByName.get(name.toLowerCase());

      if (!skill) {
        return {
          error: `Skill '${name}' not found.`,
          availableSkills: skills.map((knownSkill) => knownSkill.name),
        };
      }

      try {
        const content = await readFile(skill.skillFilePath, "utf-8");

        return {
          name: skill.name,
          skillDirectory: skill.directory,
          content: stripFrontmatter(content),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          error: `Failed to load skill '${skill.name}': ${message}`,
        };
      }
    },
  });
}
