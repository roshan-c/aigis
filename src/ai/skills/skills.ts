import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface SkillMetadata {
  name: string;
  description: string;
  directory: string;
  skillFilePath: string;
}

const SKILL_FILE_NAME = "SKILL.md";

function parseFrontmatter(content: string): Record<string, string> {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const rawFrontmatter = frontmatterMatch?.[1];

  if (!rawFrontmatter) {
    throw new Error("Missing frontmatter");
  }

  const metadata: Record<string, string> = {};

  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const kvMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
    if (!kvMatch) {
      continue;
    }

    const key = kvMatch[1];
    const value = kvMatch[2];

    if (!key || !value) {
      continue;
    }

    const rawValue = value.trim();

    const quoteChar = rawValue.charAt(0);
    if (
      (quoteChar === '"' || quoteChar === "'") &&
      rawValue.endsWith(quoteChar)
    ) {
      metadata[key] = rawValue.slice(1, -1).trim();
    } else {
      metadata[key] = rawValue;
    }
  }

  return metadata;
}

export function stripFrontmatter(content: string): string {
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!frontmatterMatch) {
    return content.trim();
  }
  return content.slice(frontmatterMatch[0].length).trim();
}

function getDefaultSkillDirectories(): string[] {
  const homeDir = process.env.HOME;
  const directories = [path.join(process.cwd(), ".agents", "skills")];

  if (homeDir) {
    directories.push(path.join(homeDir, ".agents", "skills"));
    directories.push(path.join(homeDir, ".config", "agent", "skills"));
  }

  return directories;
}

function getSkillDirectories(): string[] {
  const configuredDirectories = process.env.SKILL_DIRECTORIES;
  if (!configuredDirectories) {
    return getDefaultSkillDirectories();
  }

  return configuredDirectories
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry.startsWith("~/") && process.env.HOME) {
        return path.join(process.env.HOME, entry.slice(2));
      }
      return path.resolve(entry);
    });
}

export async function discoverSkills(
  directories: string[] = getSkillDirectories(),
): Promise<SkillMetadata[]> {
  const discoveredSkills: SkillMetadata[] = [];
  const seenSkillNames = new Set<string>();

  for (const directory of directories) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillDirectory = path.join(directory, entry.name);
      const skillFilePath = path.join(skillDirectory, SKILL_FILE_NAME);

      try {
        const skillContent = await readFile(skillFilePath, "utf-8");
        const metadata = parseFrontmatter(skillContent);

        const name = metadata.name?.trim();
        const description = metadata.description?.trim();

        if (!name || !description) {
          continue;
        }

        const normalizedName = name.toLowerCase();
        if (seenSkillNames.has(normalizedName)) {
          continue;
        }

        seenSkillNames.add(normalizedName);

        discoveredSkills.push({
          name,
          description,
          directory: skillDirectory,
          skillFilePath,
        });
      } catch {
        continue;
      }
    }
  }

  return discoveredSkills.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSkillsPrompt(skills: SkillMetadata[]): string {
  if (skills.length === 0) {
    return [
      "## Skills",
      "No SKILL.md skills are currently available.",
    ].join("\n");
  }

  const skillList = skills
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join("\n");

  return [
    "## Skills",
    "Use the loadSkill tool when the request matches a skill description.",
    "Load the skill before following skill-specific instructions or using bundled resources.",
    "Available skills:",
    skillList,
  ].join("\n");
}

let cachedSkillsPromise: Promise<SkillMetadata[]> | undefined;

export function getDiscoveredSkills(): Promise<SkillMetadata[]> {
  if (!cachedSkillsPromise) {
    cachedSkillsPromise = discoverSkills();
  }

  return cachedSkillsPromise;
}
