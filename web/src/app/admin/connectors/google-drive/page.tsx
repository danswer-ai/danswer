"use client";

import { submitIndexRequest } from "@/components/admin/connectors/IndexForm";
import { GoogleDriveIcon } from "@/components/icons/icons";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { useRouter } from "next/navigation";
import { Popup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { HealthCheckBanner } from "@/components/health/healthcheck";

export default function Page() {
  const router = useRouter();

  const {
    data: isAuthenticatedData,
    isLoading: isAuthenticatedLoading,
    error: isAuthenticatedError,
  } = useSWR<{ authenticated: boolean }>(
    "/api/admin/connector/google-drive/check-auth",
    fetcher
  );
  const {
    data: authorizationUrlData,
    isLoading: authorizationUrlLoading,
    error: authorizationUrlError,
  } = useSWR<{ auth_url: string }>(
    "/api/admin/connector/google-drive/authorize",
    fetcher
  );

  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const header = (
    <div>
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <GoogleDriveIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Google Drive</h1>
      </div>
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
      <div>
        {header}
        {popup && <Popup message={popup.message} type={popup.type} />}

        {/* TODO: add periodic support */}
        <h2 className="text-xl font-bold mb-2 ml-auto mr-auto">
          Request Indexing
        </h2>
        <p className="text-sm mb-2">
          Index the all docs in the setup Google Drive account.
        </p>
        <div className="mt-2 mb-4">
          <button
            type="submit"
            className={
              "bg-slate-500 hover:bg-slate-700 text-white " +
              "font-bold py-2 px-4 rounded focus:outline-none " +
              "focus:shadow-outline w-full max-w-sm mx-auto"
            }
            onClick={async () => {
              const { message, isSuccess } = await submitIndexRequest(
                "google_drive",
                {}
              );
              if (isSuccess) {
                setPopup({
                  message,
                  type: isSuccess ? "success" : "error",
                });
                setTimeout(() => {
                  setPopup(null);
                }, 3000);
                router.push("/admin/indexing/status");
              }
            }}
          >
            Index
          </button>
        </div>

        {/* TODO: add ability to add more accounts / switch account */}
        <div className="mb-2">
          <h2 className="text-xl font-bold mb-2 ml-auto mr-auto">
            Re-Authenticate
          </h2>
          <p className="text-sm mb-4">
            If you want to switch Google Drive accounts, you can re-authenticate
            below.
          </p>
          <a
            className={
              "group relative w-64 " +
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
