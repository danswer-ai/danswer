"use client";

import { ConfigurableSources, ValidSources } from "@/lib/types";
import AddConnector from "./AddConnectorPage";
import { FormProvider } from "@/context/FormContext";
import Sidebar from "./Sidebar";
import { HeaderTitle } from "@/components/header/HeaderTitle";
import { Button } from "@tremor/react";
import { isValidSource } from "@/lib/sources";

export default function ConnectorWrapper({
  connector,
}: {
  connector: ConfigurableSources;
}) {
  return (
    <FormProvider connector={connector}>
      <div className="w-full h-full overflow-y-auto">
        <div className="container">
          {!isValidSource(connector) ? (
            <div className="flex flex-col mx-auto gap-y-2">
              <HeaderTitle>
                <p>&lsquo;{connector}&lsquo; is not a valid Connector Type!</p>
              </HeaderTitle>
              <Button
                onClick={() => window.open("/admin/indexing/status", "_self")}
                className="mr-auto"
              >
                {" "}
                Go home{" "}
              </Button>
            </div>
          ) : (
            <AddConnector connector={connector} />
          )}
          <Sidebar />
        </div>
      </div>
    </FormProvider>
  );
}
