import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";

const ValidDomainsDisplay = () => {
  const { data: validDomains, error: domainsError } = useSWR<string[]>(
    "/api/manage/admin/valid-domains",
    errorHandlingFetcher
  );

  if (domainsError || !validDomains) {
    return (
      <ErrorCallout
        errorTitle="Error loading valid domains"
        errorMsg={domainsError?.info?.detail}
      />
    );
  }

  if (!validDomains.length) {
    return (
      <div className="text-sm">
        No invited users. Anyone can sign up with a valid email address. To
        restrict access you can:
        <div className="flex flex-wrap ml-2 mt-1">
          (1) Invite users above. Once a user has been invited, only emails that
          have explicitly been invited will be able to sign-up.
        </div>
        <div className="mt-1 ml-2">
          (2) Set the{" "}
          <b className="font-mono w-fit h-fit">VALID_EMAIL_DOMAINS</b>{" "}
          environment variable to a comma separated list of email domains. This
          will restrict access to users with email addresses from these domains.
        </div>
      </div>
    );
  }
  return (
    <div className="text-sm">
      No invited users. Anyone with an email address with any of the following
      domains can sign up: <i>{validDomains.join(", ")}</i>.
      <div className="mt-2">
        To further restrict access you can invite users above. Once a user has
        been invited, only emails that have explicitly been invited will be able
        to sign-up.
      </div>
    </div>
  );
};

export default ValidDomainsDisplay;
