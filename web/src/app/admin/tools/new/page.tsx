"use client";

import { ToolEditor } from "@/app/admin/tools/ToolEditor";
import { BackButton } from "@/components/BackButton";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function NewToolPage() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <BackButton />

        <AdminPageTitle
          title="Create Tool"
          icon={<Wrench size={32} className="my-auto" />}
        />

        <Card>
          <CardContent>
            <ToolEditor />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
