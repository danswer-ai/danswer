"use client";

import * as Yup from "yup";
import { IndexForm } from "@/components/admin/connectors/Form";
import {
  ConnectorStatusEnum,
  ConnectorStatus,
} from "@/components/admin/connectors/ConnectorStatus";
import { GoogleDriveIcon } from "@/components/icons/icons";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";

export default function Page() {
  const {
    data: isAuthenticatedData,
    isLoading: isAuthenticatedLoading,
    error: isAuthenticatedError,
  } = useSWR<{ authenticated: boolean }>(
    "/api/admin/connectors/google-drive/check-auth",
    fetcher
  );
  const {
    data: authorizationUrlData,
    isLoading: authorizationUrlLoading,
    error: authorizationUrlError,
  } = useSWR<{ auth_url: string }>(
    "/api/admin/connectors/google-drive/authorize",
    fetcher
  );

  const header = (
    <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
      <GoogleDriveIcon size="32" />
      <h1 className="text-3xl font-bold pl-2">Google Drive</h1>
    </div>
  );

  let body = null;
  if (isAuthenticatedLoading || authorizationUrlLoading) {
    return (
      <div className="mx-auto">
        {header}
        <LoadingAnimation text="" />
      </div>
    );
  }
  if (
    isAuthenticatedError ||
    isAuthenticatedData?.authenticated === undefined
  ) {
    return (
      <div className="mx-auto">
        {header}
        <div className="text-red-500">
          Error loading Google Drive authentication status. Contact an
          administrator.
        </div>
      </div>
    );
  }
  if (authorizationUrlError || authorizationUrlData?.auth_url === undefined) {
    return (
      <div className="mx-auto">
        {header}
        <div className="text-red-500">
          Error loading Google Drive authentication URL. Contact an
          administrator.
        </div>
      </div>
    );
  }

  if (isAuthenticatedData.authenticated) {
    return (
      <div className="mx-auto">
        {header}

        <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
          Status
        </h2>
        <ConnectorStatus
          status={ConnectorStatusEnum.Setup}
          source="google_drive"
        />

        {/* TODO: make this periodic */}
        <div className="w-fit mt-2">
          <IndexForm
            source="google_drive"
            formBody={null}
            validationSchema={Yup.object().shape({})}
            initialValues={{}}
            onSubmit={(isSuccess) => console.log(isSuccess)}
          />
        </div>

        {/* 
          TODO: add back ability add more accounts / switch account
          <a
            className={
              "group relative w-64 flex justify-center " +
              "py-2 px-4 border border-transparent text-sm " +
              "font-medium rounded-md text-white bg-red-600 " +
              "hover:bg-red-700 focus:outline-none focus:ring-2 " +
              "focus:ring-offset-2 focus:ring-red-500 mx-auto"
            }
            href={authorizationUrlData.auth_url}
          >
            Re-Authenticate
          </a> */}
      </div>
    );
  }

  return (
    <div className="mx-auto">
      {header}

      <div className="flex">
        <div className="max-w-2xl mx-auto border p-3 border-gray-700 rounded-md">
          <h2 className="text-xl font-bold mb-2 mt-6 ml-auto mr-auto">Setup</h2>
          <p className="text-sm mb-4">
            To use the Google Drive connector, you must first provide
            credentials via OAuth. This gives us read access to the docs in your
            google drive account.
          </p>
          <a
            className={
              "group relative w-64 flex justify-center " +
              "py-2 px-4 border border-transparent text-sm " +
              "font-medium rounded-md text-white bg-red-600 " +
              "hover:bg-red-700 focus:outline-none focus:ring-2 " +
              "focus:ring-offset-2 focus:ring-red-500 mx-auto"
            }
            href={authorizationUrlData.auth_url}
          >
            Authenticate with Google Drive
          </a>
        </div>
      </div>
    </div>
  );
}
