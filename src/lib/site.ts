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
    "Ali Uyar is a principal AI engineer in Vienna working on the evaluation, alignment, security and interpretability of AI systems. Papers with abstracts, data sheets and PDFs, and essays.",
  personId: "https://aliuyar.dev/#ali",
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
