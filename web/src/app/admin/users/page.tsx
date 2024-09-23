"use client";
import InvitedUserTable from "@/components/admin/users/InvitedUserTable";
import SignedUpUserTable from "@/components/admin/users/SignedUpUserTable";
import { SearchBar } from "@/components/search/SearchBar";
import { useState } from "react";
import { LoadingAnimation } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { UsersIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import { ErrorCallout } from "@/components/ErrorCallout";
import { HidableSection } from "@/app/admin/assistants/HidableSection";
import BulkAdd from "@/components/admin/users/BulkAdd";
import { UsersResponse } from "@/lib/users/interfaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PlusSquare } from "lucide-react";
import { AllUsers } from "./AllUsers";
import { PendingInvites } from "./PedingInvites";
import { Separator } from "@/components/ui/separator";
import { CustomModal } from "@/components/CustomModal";
import { AddUserButton } from "./AddUserButton";

const ValidDomainsDisplay = ({ validDomains }: { validDomains: string[] }) => {
  if (!validDomains.length) {
    return (
      <div className="text-sm">
        No invited users. Anyone can sign up with a valid email address. To
        restrict access you can:
        <div className="flex flex-wrap mt-1 ml-2">
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

const UsersTables = ({ q }: { q: string }) => {
  const [invitedPage, setInvitedPage] = useState(1);
  const [acceptedPage, setAcceptedPage] = useState(1);
  const { data, isLoading, mutate, error } = useSWR<UsersResponse>(
    `/api/manage/users?q=${encodeURI(q)}&accepted_page=${
      acceptedPage - 1
    }&invited_page=${invitedPage - 1}`,
    errorHandlingFetcher
  );
  const {
    data: validDomains,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useSWR<string[]>("/api/manage/admin/valid-domains", errorHandlingFetcher);

  if (isLoading || isLoadingDomains) {
    return <LoadingAnimation text="Loading" />;
  }

  if (error || !data) {
    return (
      <ErrorCallout
        errorTitle="Error loading users"
        errorMsg={error?.info?.detail}
      />
    );
  }

  if (domainsError || !validDomains) {
    return (
      <ErrorCallout
        errorTitle="Error loading valid domains"
        errorMsg={domainsError?.info?.detail}
      />
    );
  }

  const { accepted, invited, accepted_pages, invited_pages } = data;

  // remove users that are already accepted
  const finalInvited = invited.filter(
    (user) => !accepted.map((u) => u.email).includes(user.email)
  );

  return (
    <>
      <HidableSection sectionTitle="Invited Users" defaultOpen>
        {invited.length > 0 ? (
          finalInvited.length > 0 ? (
            <InvitedUserTable
              users={finalInvited}
              currentPage={invitedPage}
              onPageChange={setInvitedPage}
              totalPages={invited_pages}
              mutate={mutate}
            />
          ) : (
            <div className="text-sm">
              To invite additional teammates, use the <b>Invite Users</b> button
              above!
            </div>
          )
        ) : (
          <ValidDomainsDisplay validDomains={validDomains} />
        )}
      </HidableSection>
      <SignedUpUserTable
        users={accepted}
        currentPage={acceptedPage}
        onPageChange={setAcceptedPage}
        totalPages={accepted_pages}
        mutate={mutate}
      />
    </>
  );
};

const SearchableTables = () => {
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");

  return (
    <div className="pb-20 w-full">
      {/* <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <AddUserButton />
          <div className="flex-grow">
            <SearchBar
              query={query}
              setQuery={setQuery}
              onSearch={() => setQ(query)}
            />
          </div>
        </div>
        <UsersTables q={q} />
      </div> */}

      <AllUsers q={q} />
      <Separator className="my-10" />
      <PendingInvites q={q} />
    </div>
  );
};

const Page = () => {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle title="Manage Users" icon={<UsersIcon size={32} />} />
        <SearchableTables />
      </div>
    </div>
  );
};

export default Page;
