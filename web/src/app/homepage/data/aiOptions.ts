export interface Feature {
  category: string;
  title: string;
  description: string;
}

export const aiOptionsData: Feature[] = [
  {
    category: "Assistants",
    title: "Speed up RFP responses with AI-drafting",
    description:
      "Use AI to search through your RFP knowledge base and draft proposal sections.",
  },
  {
    category: "Assistants",
    title: "Assist clinical support with a custom AI co-pilot",
    description:
      "Generate suggestions for treatment plans and diagnoses based on patient data.",
  },
  {
    category: "Assistants",
    title: "Improve students learning experience with AI",
    description:
      "Facilitate resource discovery, enhance material comprehension and assignment completion.",
  },
  {
    category: "Applications",
    title: "Analyze contracts and financial reports in seconds",
    description:
      "Perform due-diligence, financial report comparison, and investment memo generation.",
  },
  {
    category: "Applications",
    title: "Automate SOAP notes generation for healthcare visits",
    description:
      "Transcribe visit recording and automaticaly generate SOAP notes for the EHR system.",
  },
  {
    category: "Applications",
    title: "Analyze sales call recordings for insights",
    description:
      "Perform sales call critiques automatically and provide feedback to sales representatives.",
  },
  {
    category: "Automations",
    title: "Check communication compliance at scale",
    description:
      "Automate compliance verification in your sales representative communications.",
  },
  {
    category: "Automations",
    title: "Automate web research for lead generation",
    description:
      "Classify and collect lead information based on web research at scale.",
  },
  {
    category: "Automations",
    title: "Review student assignments and applications at scale",
    description:
      "Automate the review process for assignments and applications, providing feedback.",
  },
];
