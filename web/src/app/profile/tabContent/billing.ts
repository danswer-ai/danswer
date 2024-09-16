export interface BillingData {
  plan: string;
  price: number;
  features: {
    fileUploadsAndWebpage: boolean;
    chatAndConversation: boolean;
    searchAndQuery: boolean;
    sourceReferenceDisplay: boolean;
    connectToCloudStorage: boolean;
    supportsCustomLLMs: boolean;
    connectToGoogleDrive: boolean;
    dataAnalysisAndVisualization: boolean;
    workflowAutomation: boolean;
    api: boolean;
    supportsDifferentAI: boolean;
  };
  isActive: boolean;
}

export const billingData: BillingData[] = [
  {
    plan: "Basic",
    price: 200,
    features: {
      fileUploadsAndWebpage: true,
      chatAndConversation: true,
      searchAndQuery: true,
      sourceReferenceDisplay: true,
      connectToCloudStorage: false,
      supportsCustomLLMs: false,
      connectToGoogleDrive: true,
      dataAnalysisAndVisualization: false,
      workflowAutomation: false,
      api: false,
      supportsDifferentAI: true,
    },
    isActive: true,
  },
  {
    plan: "Professional",
    price: 400,
    features: {
      fileUploadsAndWebpage: true,
      chatAndConversation: true,
      searchAndQuery: true,
      sourceReferenceDisplay: true,
      connectToCloudStorage: true,
      supportsCustomLLMs: true,
      connectToGoogleDrive: true,
      dataAnalysisAndVisualization: true,
      workflowAutomation: true,
      api: true,
      supportsDifferentAI: false,
    },
    isActive: false,
  },
  {
    plan: "Organization",
    price: 800,
    features: {
      fileUploadsAndWebpage: true,
      chatAndConversation: true,
      searchAndQuery: true,
      sourceReferenceDisplay: true,
      connectToCloudStorage: true,
      supportsCustomLLMs: true,
      connectToGoogleDrive: true,
      dataAnalysisAndVisualization: true,
      workflowAutomation: true,
      api: true,
      supportsDifferentAI: false,
    },
    isActive: false,
  },
];
/* Supports OpenAI, Anthropic, Azure OpenAI, AWS Bedrock */
