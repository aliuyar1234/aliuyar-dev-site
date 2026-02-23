const researchSignals = ["research", "paper", "publication", "arxiv", "thesis", "technical-report"];

export const extractGitHubRepoName = (url = "") => {
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? match[2].toLowerCase() : "";
};

export const buildResearchRepoNameSet = (researchEntries = []) => {
  const set = new Set();

  for (const entry of researchEntries) {
    const names = [extractGitHubRepoName(entry.codeUrl), extractGitHubRepoName(entry.paperUrl)].filter(Boolean);
    for (const name of names) {
      set.add(name);
    }
  }

  return set;
};

export const isResearchRepo = (project, researchRepoNames = new Set()) => {
  const name = (project?.name || "").toLowerCase();
  if (researchRepoNames.has(name)) {
    return true;
  }

  const blob = `${project?.name || ""} ${project?.description || ""}`.toLowerCase();
  const topicMatch = (project?.repositoryTopics || []).some((topic) =>
    researchSignals.some((signal) => String(topic).toLowerCase().includes(signal))
  );
  const textMatch = researchSignals.some((signal) => blob.includes(signal));
  return topicMatch || textMatch;
};

export const filterProductProjects = (projects = [], researchEntries = []) => {
  const researchRepoNames = buildResearchRepoNameSet(researchEntries);
  return projects.filter((project) => !isResearchRepo(project, researchRepoNames));
};

export const filterResearchProjects = (projects = [], researchEntries = []) => {
  const researchRepoNames = buildResearchRepoNameSet(researchEntries);
  return projects.filter((project) => isResearchRepo(project, researchRepoNames));
};
