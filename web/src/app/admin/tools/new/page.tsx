"use client";

import { ToolEditor } from "@/app/admin/tools/ToolEditor";
import { BackButton } from "@/components/BackButton";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, CardContent } from "@/components/ui/card";
import { FiTool } from "react-icons/fi";

export default function NewToolPage() {
  return (
    <div className="container mx-auto py-24 md:py-32 lg:pt-16">
      <BackButton />

      <AdminPageTitle
        title="Create Tool"
        icon={<FiTool size={32} className="my-auto" />}
      />

      <Card>
        <CardContent>
          <ToolEditor />
        </CardContent>
      </Card>
    </div>
  );
}
