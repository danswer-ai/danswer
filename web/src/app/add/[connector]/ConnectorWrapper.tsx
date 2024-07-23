"use client";

import { ValidSources } from "@/lib/types";
import AddConnector from "./AddConnectorPage";
import { FormProvider } from "@/components/context/FormContext";
import Sidebar from "./Sidebar";

export default function ConnectorWrapper({ connector }: { connector: string }) {
  return (
    <FormProvider>
      <div className="flex justify-center w-full h-full">
        <Sidebar />
        <div className="mt-12 w-full max-w-3xl mx-auto">
          <AddConnector connector={connector as ValidSources} />
        </div>
      </div>
    </FormProvider>
  );
}
