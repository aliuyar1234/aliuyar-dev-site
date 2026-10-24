export const SITE = {
  url: "https://aliuyar.dev",
  name: "Ali Uyar",
  email: "contact@aliuyar.dev",
  github: "https://github.com/aliuyar1234",
  location: "Vienna, Austria",
  jobTitle: "Principal AI Engineer",
  employer: "Giesswein",
  title: "Ali Uyar: AI alignment, security and evaluation",
  description:
    "Ali Uyar is a Principal AI Engineer in Vienna, building agents for real work and researching how to check them: alignment, security, evaluation and interpretability, in 21 papers.",
  personId: "https://aliuyar.dev/#ali",
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
