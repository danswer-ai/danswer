"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cog, ChartNoAxesColumnIncreasing, User } from "lucide-react";
import General from "./TabContent/General";
import { Configuration } from "./TabContent/Configuration";

export function SettingsForm() {
  return (
    <div>
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User size={16} /> General
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            className="flex items-center gap-2"
          >
            <Cog size={16} /> Configuration
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="w-full">
          <General />
        </TabsContent>
        <TabsContent value="configuration">
          <Configuration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
