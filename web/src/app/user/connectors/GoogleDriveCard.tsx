import { Button } from "@/components/Button";
import { GoogleDriveIcon } from "@/components/icons/icons";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { setupGoogleDriveOAuth } from "@/lib/googleDrive";
import { GoogleDriveCredentialJson, Credential } from "@/lib/types";
import { GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME } from "@/lib/constants";
import Cookies from "js-cookie";
import { CardProps } from "./interface";
import { CheckCircle, MinusCircle } from "@phosphor-icons/react";

export const GoogleDriveCard = ({
  connector,
  userCredentials,
  setPopup,
  router,
  mutate,
}: CardProps) => {
  if (!connector) return null;

  const existingCredential: Credential<GoogleDriveCredentialJson> | undefined =
    userCredentials?.find(
      (credential) =>
        credential.credential_json?.google_drive_tokens !== undefined &&
        !credential.public_doc
    );

  const credentialIsLinked =
    existingCredential !== undefined &&
    connector.credential_ids.includes(existingCredential.id);

  return (
    <div className="border rounded border-gray-700 p-3 w-80">
      <div className="flex items-center">
        <GoogleDriveIcon size="20" />{" "}
        <b className="ml-2 text-xl">Google Drive</b>
      </div>

      <div>
        {existingCredential && credentialIsLinked ? (
          <div className="text-green-600 flex text-sm mt-1">
            <CheckCircle className="my-auto mr-1" size="16" />
            Enabled
          </div>
        ) : (
          <div className="text-gray-400 flex text-sm mt-1">
            <MinusCircle className="my-auto mr-1" size="16" />
            Not Setup
          </div>
        )}
      </div>

      <div className="text-sm mt-2">
        {existingCredential ? (
          credentialIsLinked ? (
            <>
              <p>
                Danswer has access to your Google Drive documents! Don&apos;t
                worry, only <b>you</b> will be able to see your private
                documents. You can revoke this access by clicking the button
                below.
              </p>
              <div className="mt-2 flex">
                <Button
                  onClick={async () => {
                    await deleteCredential(existingCredential.id);
                    setPopup({
                      message: "Successfully revoked access to Google Drive!",
                      type: "success",
                    });
                    mutate("/api/manage/connector");
                    mutate("/api/manage/credential");
                  }}
                  fullWidth
                >
                  Revoke Access
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>
                We&apos;ve received your credentials from Google! Click the
                button below to activate the connector - we will pull the latest
                state of your documents every <b>10</b> minutes.
              </p>
              <div className="mt-2 flex">
                <Button
                  onClick={async () => {
                    await linkCredential(connector.id, existingCredential.id);
                    setPopup({
                      message: "Activated!",
                      type: "success",
                    });
                    mutate("/api/manage/connector");
                  }}
                  fullWidth
                >
                  Activate
                </Button>
              </div>
            </>
          )
        ) : (
          <>
            <p>
              If you want to make all your Google Drive documents searchable
              through Danswer, click the button below! Don&apos;t worry, only{" "}
              <b>you</b> will be able to see your private documents. Currently,
              you&apos;ll only be able to search through documents shared with
              the whole company.
            </p>
            <div className="mt-2 flex">
              <Button
                onClick={async () => {
                  const [authUrl, errorMsg] = await setupGoogleDriveOAuth({
                    isPublic: false,
                  });
                  if (authUrl) {
                    // cookie used by callback to determine where to finally redirect to
                    Cookies.set(
                      GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME,
                      "false",
                      {
                        path: "/",
                      }
                    );
                    router.push(authUrl);
                    return;
                  }

                  setPopup({
                    message: errorMsg,
                    type: "error",
                  });
                }}
                fullWidth
              >
                Authenticate with Google Drive
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
