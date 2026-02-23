#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve("src/content/projects.json");
const owner = "aliuyar1234";

function runGh() {
  const cmd = [
    "gh repo list",
    owner,
    "--limit 200",
    "--visibility public",
    "--json name,description,stargazerCount,url,updatedAt,primaryLanguage,homepageUrl,repositoryTopics,isFork,isPrivate,diskUsage"
  ].join(" ");

  const raw = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  return JSON.parse(raw);
}

function normalize(repos) {
  return repos
    .filter((repo) => !repo.isFork)
    .filter((repo) => repo.isPrivate !== true)
    .filter((repo) => (repo.diskUsage || 0) > 0)
    .map((repo) => ({
      name: repo.name,
      description: repo.description || "",
      stargazerCount: repo.stargazerCount || 0,
      url: repo.url,
      updatedAt: repo.updatedAt,
      primaryLanguage: repo.primaryLanguage?.name || "",
      homepageUrl: repo.homepageUrl || "",
      repositoryTopics: (repo.repositoryTopics || []).map((topic) => topic.topic?.name || topic.name).filter(Boolean)
    }))
    .sort((a, b) => {
      if (b.stargazerCount !== a.stargazerCount) {
        return b.stargazerCount - a.stargazerCount;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

try {
  const repos = runGh();
  const projects = normalize(repos);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(projects, null, 2)}\n`, "utf8");

  console.log(`Wrote ${projects.length} projects to ${outputPath}`);
} catch (error) {
  console.error("Failed to sync GitHub projects.");
  console.error(error.message);
  process.exit(1);
}
