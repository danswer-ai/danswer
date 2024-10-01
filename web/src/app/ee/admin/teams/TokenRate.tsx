import { Input } from "@/components/ui/input";
import React from "react";

interface TokenRateProps {}

export const TokenRate: React.FC<TokenRateProps> = ({}) => {
  return (
    <div className="flex items-center gap-4 w-full">
      <Input placeholder="Time Window (Hours)" type="number" />
      <Input placeholder="Token Budget (Thousands)" type="number" />
    </div>
  );
};
