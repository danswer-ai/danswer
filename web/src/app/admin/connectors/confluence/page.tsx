"use client";

import * as Yup from "yup";
import { IndexForm } from "@/components/admin/connectors/Form";
import { ConfluenceIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";

export default function Page() {
  return (
    <div className="mx-auto">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <ConfluenceIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Confluence</h1>
      </div>

      {/* TODO: make this periodic */}
      <h2 className="text-xl font-bold mb-2 mt-6 ml-auto mr-auto">
        Request Indexing
      </h2>
      <p className="text-sm mb-4">
        To use the Confluence connector, you must first follow the guide
        described{" "}
        <a
          className="text-blue-500"
          href="https://docs.danswer.dev/connectors/slack#setting-up"
        >
          here
        </a>{" "}
        to give the Danswer backend read access to your documents. Once that is
        setup, specify any link to a Confluence page below and click
        &quot;Index&quot; to Index. Based on the provided link, we will index
        the ENTIRE SPACE, not just the specified page. For example, entering{" "}
        <i>https://danswer.atlassian.net/wiki/spaces/SD/overview</i> and
        clicking the Index button will index the whole <i>SD</i> Confluence
        space.
      </p>
      <div className="border-solid border-gray-600 border rounded-md p-6">
        <IndexForm
          source="confluence"
          formBody={
            <>
              <TextFormField name="wiki_page_url" label="Confluence URL:" />
            </>
          }
          validationSchema={Yup.object().shape({
            wiki_page_url: Yup.string().required(
              "Please enter any link to your confluence e.g. https://danswer.atlassian.net/wiki/spaces/SD/overview"
            ),
          })}
          initialValues={{
            wiki_page_url: "",
          }}
          onSubmit={(isSuccess) => console.log(isSuccess)}
        />
      </div>
    </div>
  );
}
