"use client";

import { ChatSession } from "@/app/chat/interfaces";
import { User, ValidSources } from "@/lib/types";
import SidebarWrapper from "@/app/assistants/SidebarWrapper";
import AddConnector from "./AddConnectorPage";
import { useState } from "react";
import { FormProvider } from "@/components/context/FormContext";
import { SourceCategory } from "@/lib/search/interfaces";
import { AdminSidebar } from "@/components/admin/connectors/AdminSidebar";
import Sidebar from "./Sidebar";

export default function WrappedPage({
  initiallyToggled,
  connector,
  user,
}: {
  connector: string;
  initiallyToggled: boolean;
  user: User | null;
}) {
  const [index, setIndex] = useState(1);

  const increment = () => {
    setIndex((index) => index + 1);
  };
  const decrement = () => {
    setIndex((index) => index - 1);
  };
  const adminSetupProps = {
    steps: ["Credential", "Connector", "Advanced (optional)", "Finalize"],
    index: index - 1,
  };

  return (
    <FormProvider>
      {/* <SidebarWrapper
        adminSetupProps={{
          steps: ["Credentials", "Channel", "Finalize"],
          index: index - 1,
          max_index: index - 1,
        }}
        page="admin"
        initiallyToggled={initiallyToggled}
        headerProps={{ user, page: "admin" }}
        contentProps={{
          index,
          increment,
          decrement,
        }}
        content={(contentProps) => ( */}

      <div className="flex justify-center w-full h-full">
        <Sidebar adminSetupProps={adminSetupProps} />
        <div className="mt-12 w-full max-w-3xl mx-auto">
          <AddConnector connector={connector as ValidSources} />
        </div>
      </div>

      {/* )}
      /> */}
    </FormProvider>
  );
}
