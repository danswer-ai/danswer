import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User as UserTypes } from "@/lib/types";
import { billingData, BillingData } from "./billing";
import { Check } from "lucide-react";

const BillingCard = ({ plan, price, features, isActive }: BillingData) => {
  return (
    <Card>
      <CardContent>
        <div>
          <div className="flex flex-col">
            <div className="flex gap-4 items-center font">
              <span>enMedD {plan} Plan</span>
              {isActive && <Badge>Active</Badge>}
            </div>
            <p className="font-bold pt-4">
              <span className="text-5xl">€{price}</span> / Team / Month
            </p>
          </div>
          <ul className="pt-6 flex flex-col gap-4">
            {features.fileUploadsAndWebpage && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" /> File
                Uploads & Webpage
              </li>
            )}
            {features.chatAndConversation && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" /> Chat &
                Conversation
              </li>
            )}
            {features.searchAndQuery && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" /> Search
                & Query
              </li>
            )}
            {features.sourceReferenceDisplay && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" /> Source
                Reference Display
              </li>
            )}
            {features.connectToCloudStorage && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" />{" "}
                Connect to Cloud Storage (AWS S3, Cloudflare R2, GCP, Oracle
                Cloud)
              </li>
            )}
            {features.supportsCustomLLMs && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" />{" "}
                Supports Custom LLMs
              </li>
            )}
            {features.connectToGoogleDrive && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" />{" "}
                Connect to Google Drive, Sharepoint, Jira, Graal, Teams,
                Confluence, GitHub, Notion, Hudso, Salesforce, etc.
              </li>
            )}
            {features.dataAnalysisAndVisualization && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" /> Data
                Analysis & Visualization
              </li>
            )}
            {features.workflowAutomation && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" />{" "}
                Workflow Automation
              </li>
            )}
            {features.api && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" /> API
              </li>
            )}
            {features.supportsDifferentAI && (
              <li className="flex gap-3">
                <Check size={24} className="shrink-0" stroke="#69c57d" />{" "}
                Supports OpenAI, Anthropic, Azure OpenAI, AWS Bedrock
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default function BillingTab({ user }: { user: UserTypes | null }) {
  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {billingData.map((data) => (
          <BillingCard key={data.plan} {...data} />
        ))}
      </div>
    </div>
  );
}
