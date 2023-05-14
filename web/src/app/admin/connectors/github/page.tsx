"use client";

import * as Yup from "yup";
import { IndexForm } from "@/components/admin/connectors/Form";
import {
  ConnectorStatus,
  ReccuringConnectorStatus,
} from "@/components/admin/connectors/RecurringConnectorStatus";
import { GithubIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";

export default function Page() {
  return (
    <div className="mx-auto">
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <GithubIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Github PRs</h1>
      </div>

      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Status
      </h2>
      <ReccuringConnectorStatus
        status={ConnectorStatus.Running}
        source="github"
      />

      {/* TODO: make this periodic */}
      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Request Indexing
      </h2>
      <div className="border-solid border-gray-600 border rounded-md p-6">
        <IndexForm
          source="github"
          formBody={
            <>
              <TextFormField name="repo_owner" label="Owner of repo:" />
              <TextFormField name="repo_name" label="Name of repo:" />
            </>
          }
          validationSchema={Yup.object().shape({
            repo_owner: Yup.string().required(
              "Please enter the owner of the repo scrape e.g. danswer-ai"
            ),
            repo_name: Yup.string().required(
              "Please enter the name of the repo scrape e.g. danswer "
            ),
          })}
          initialValues={{
            repo_owner: "",
            repo_name: "",
          }}
          onSubmit={(isSuccess) => console.log(isSuccess)}
        />
      </div>
    </div>
  );
}
