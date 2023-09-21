"use client";

import * as Yup from "yup";
import { ProductboardIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  ProductboardConfig,
  ConnectorIndexingStatus,
  ProductboardCredentialJson,
  Credential,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePublicCredentials } from "@/lib/hooks";

const Main = () => {
  const { popup, setPopup } = usePopup();

  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
    isValidating: isCredentialsValidating,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    isConnectorIndexingStatusesLoading ||
    isCredentialsLoading ||
    isCredentialsValidating
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (isConnectorIndexingStatusesError || !connectorIndexingStatuses) {
    return <div>Failed to load connectors</div>;
  }

  if (isCredentialsError || !credentialsData) {
    return <div>Failed to load credentials</div>;
  }

  const productboardConnectorIndexingStatuses: ConnectorIndexingStatus<
    ProductboardConfig,
    ProductboardCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "productboard"
  );
  const productboardCredential:
    | Credential<ProductboardCredentialJson>
    | undefined = credentialsData.find(
    (credential) => credential.credential_json?.productboard_access_token
  );

  return (
    <>
      {popup}
      <p className="text-sm">
        This connector allows you to sync all your <i>Features</i>,{" "}
        <i>Components</i>, <i>Products</i>, and <i>Objectives</i> from
        Productboard into Danswer. At this time, the Productboard APIs does not
        support pulling in <i>Releases</i> or <i>Notes</i>.
      </p>

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </h2>

      {productboardCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Access Token: </p>
            <p className="ml-1 italic my-auto max-w-md truncate">
              {
                productboardCredential.credential_json
                  ?.productboard_access_token
              }
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (productboardConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(productboardCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            To use the Productboard connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://developer.productboard.com/#section/Authentication/Public-API-Access-Token"
            >
              here
            </a>{" "}
            to generate an Access Token.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<ProductboardCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="productboard_access_token"
                    label="Access Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                productboard_access_token: Yup.string().required(
                  "Please enter your Productboard access token"
                ),
              })}
              initialValues={{
                productboard_access_token: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  refreshCredentials();
                }
              }}
            />
          </div>
        </>
      )}

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Start indexing!
      </h2>
      {productboardCredential ? (
        !productboardConnectorIndexingStatuses.length ? (
          <>
            <p className="text-sm mb-2">
              Click the button below to start indexing! We will pull the latest
              features, components, and products from Productboard every{" "}
              <b>10</b> minutes.
            </p>
            <div className="flex">
              <ConnectorForm<ProductboardConfig>
                nameBuilder={() => "ProductboardConnector"}
                ccPairNameBuilder={() => "Productboard"}
                source="productboard"
                inputType="poll"
                formBody={null}
                validationSchema={Yup.object().shape({})}
                initialValues={{}}
                refreshFreq={10 * 60} // 10 minutes
                credentialId={productboardCredential.id}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-2">
              Productboard connector is setup! We are pulling the latest
              features, components, and products from Productboard every{" "}
              <b>10</b> minutes.
            </p>
            <ConnectorsTable<ProductboardConfig, ProductboardCredentialJson>
              connectorIndexingStatuses={productboardConnectorIndexingStatuses}
              liveCredential={productboardCredential}
              getCredential={(credential) => {
                return (
                  <div>
                    <p>
                      {credential.credential_json.productboard_access_token}
                    </p>
                  </div>
                );
              }}
              onCredentialLink={async (connectorId) => {
                if (productboardCredential) {
                  await linkCredential(connectorId, productboardCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </>
        )
      ) : (
        <>
          <p className="text-sm">
            Please provide your access token in Step 1 first! Once done with
            that, you can then start indexing all your Productboard features,
            components, and products.
          </p>
        </>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <ProductboardIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Productboard</h1>
      </div>
      <Main />
    </div>
  );
}
