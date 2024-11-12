import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

export default function FilterButton({
  setActivityFilter,
  setPermissionsFilter,
  setDocsFilter,
  setStatusFilter,
}: {
  setActivityFilter: (value: string | null) => void;
  setPermissionsFilter: (value: string | null) => void;
  setDocsFilter: (value: number | null) => void;
  setStatusFilter: (value: string | null) => void;
}) {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>
          <Button variant="outline" size="icon">
            <Filter size={16} className="shrink-0" />
          </Button>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>Activity</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onClick={() => setActivityFilter("Active")}>
                Active
              </MenubarItem>
              <MenubarItem onClick={() => setActivityFilter("Pause")}>
                Pause
              </MenubarItem>
              <MenubarItem onClick={() => setActivityFilter("Deleting")}>
                Deleting
              </MenubarItem>
              <MenubarItem onClick={() => setActivityFilter("not_started")}>
                Scheduled
              </MenubarItem>
              <MenubarItem onClick={() => setActivityFilter("in_progress")}>
                Indexing
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>

          <MenubarSub>
            <MenubarSubTrigger>Permissions</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onClick={() => setPermissionsFilter("Public")}>
                Public
              </MenubarItem>
              <MenubarItem onClick={() => setPermissionsFilter("Private")}>
                Private
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>

          <MenubarSub>
            <MenubarSubTrigger>Total Docs</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onClick={() => setDocsFilter(0)}>0</MenubarItem>
              <MenubarItem onClick={() => setDocsFilter(10)}>10+</MenubarItem>
              <MenubarItem onClick={() => setDocsFilter(100)}>100+</MenubarItem>
              <MenubarItem onClick={() => setDocsFilter(1000)}>
                1000+
              </MenubarItem>
              <MenubarItem onClick={() => setDocsFilter(10000)}>
                10000+
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>

          <MenubarSub>
            <MenubarSubTrigger>Last Status</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onClick={() => setStatusFilter("success")}>
                Success
              </MenubarItem>
              <MenubarItem onClick={() => setStatusFilter("in_progress")}>
                Scheduled
              </MenubarItem>
              <MenubarItem onClick={() => setStatusFilter("not_started")}>
                Not Started
              </MenubarItem>
              <MenubarItem onClick={() => setStatusFilter("failed")}>
                Failed
              </MenubarItem>
              <MenubarItem
                onClick={() => setStatusFilter("completed_with_errors")}
              >
                Completed with errors
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
