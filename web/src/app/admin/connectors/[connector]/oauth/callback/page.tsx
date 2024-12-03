"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button } from "@/components/ui/button";
import Title from "@/components/ui/title";
import {
  useConnectorOAuthCallback,
  useSlackConnectorOAuthCallback,
} from "@/lib/hooks";
import { KeyIcon } from "@/components/icons/icons";
import { getSourceMetadata, isValidSource } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import CardSection from "@/components/admin/CardSection";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusMessage, setStatusMessage] = useState("Processing...");
  const [statusDetails, setStatusDetails] = useState(
    "Please wait while we complete the setup."
  );
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pageTitle, setPageTitle] = useState(
    "Authorize with Third-Party service"
  );

  // Extract query parameters
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const pathname = usePathname();
  const connector = pathname?.split("/")[3];

  const { data, error, isLoading } = useConnectorOAuthCallback(
    connector,
    code,
    state
  );

  useEffect(() => {
    if (!code || !state) {
      setStatusMessage("Improperly formed OAuth authorization request.");
      setStatusDetails(
        !code ? "Missing authorization code." : "Missing state parameter."
      );
      setIsError(true);
      return;
    }

    if (!isValidSource(connector)) {
      setStatusMessage(
        `The specified connector source type ${connector} does not exist.`
      );
      setStatusDetails(`${connector} is not a valid source type.`);
      setIsError(true);
      return;
    }

    const sourceMetadata = getSourceMetadata(connector as ValidSources);
    setPageTitle(`Authorize with ${sourceMetadata.displayName}`);

    if (isLoading) {
      setStatusMessage("Processing...");
      setStatusDetails("Please wait while we complete authorization.");
      setIsError(false); // Ensure no error state during loading
      return;
    }

    console.log("OAuth data:", data);
    if (!data || error) {
      console.error("OAuth error:", error);
      setStatusMessage("Oops, something went wrong!");
      setStatusDetails(
        "An error occurred during the OAuth process. Please try again."
      );
      setIsError(true);
      return;
    }

    setStatusMessage("Success!");
    setStatusDetails(
      `Your ${sourceMetadata.displayName} app has been installed successfully.`
    );
    setRedirectUrl(data.redirect_on_success); // Extract the redirect URL
    setIsError(false);
  }, [code, state, error, isLoading]);

  return (
    <div className="container mx-auto py-8">
      <AdminPageTitle title={pageTitle} icon={<KeyIcon size={32} />} />

      <div className="flex flex-col items-center justify-center min-h-screen">
        <CardSection className="max-w-md">
          <h1 className="text-2xl font-bold mb-4">{statusMessage}</h1>
          <p className="text-text-500">{statusDetails}</p>
          {redirectUrl && !isError && (
            <div className="mt-4">
              <p className="text-sm">
                Click{" "}
                <a href={redirectUrl} className="text-blue-500 underline">
                  here
                </a>{" "}
                to continue.
              </p>
            </div>
          )}
        </CardSection>
      </div>

      {/* <div
        className={`rounded-lg p-6 shadow-md bg-white text-center ${
          isError ? "border border-red-500" : "border border-green-500"
        }`}
      >
        <Title className={isError ? "text-red-600" : "text-green-600"}>
          {statusMessage}
        </Title>
        <p className="mt-2 text-sm text-muted">{statusDetails}</p>

        {redirectUrl && !isError && (
          <div className="mt-4">
            <p className="text-sm">
              Click{" "}
              <a href={redirectUrl} className="text-blue-500 underline">
                here
              </a>{" "}
              to proceed to the next step.
            </p>
          </div>
        )}

        {isError && (
          <Button
            variant="destructive-reverse"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        )}
      </div> */}
    </div>
  );
}
