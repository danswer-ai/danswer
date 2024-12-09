import { useState } from "react";

import InvitedUserTable from "@/components/admin/users/InvitedUserTable";
import BulkAdd from "@/components/admin/users/BulkAdd";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { FiPlusSquare } from "react-icons/fi";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PageSelector } from "@/components/PageSelector";

import { type User } from "@/lib/types";
import { mutate } from "swr";

const ITEMS_PER_PAGE = 10;
const PAGES_PER_BATCH = 2;

const InviteUsersModal = ({
  setPopup,
}: {
  setPopup: (spec: PopupSpec) => void;
}) => {
  const {
    currentPageData: pageOfUsers,
    isLoading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
    hasNoData: noInvitedUsers,
  } = usePaginatedFetch<User>({
    itemsPerPage: ITEMS_PER_PAGE,
    pagesPerBatch: PAGES_PER_BATCH,
    endpoint: "/api/manage/users/invited",
  });

  const [modal, setModal] = useState(false);
  const onSuccess = () => {
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/manage/users")
    );
    setModal(false);
    setPopup({
      message: "Users invited!",
      type: "success",
    });
  };
  const onFailure = async (res: Response) => {
    const error = (await res.json()).detail;
    setPopup({
      message: `Failed to invite users - ${error}`,
      type: "error",
    });
  };
  return (
    <>
      <Button
        className="my-auto w-fit"
        variant="update"
        onClick={() => setModal(true)}
      >
        <div className="flex">
          <FiPlusSquare className="my-auto mr-2" />
          Invite Users
        </div>
      </Button>

      {modal && (
        <Modal title="Bulk Add Users" onOutsideClick={() => setModal(false)}>
          <div className="flex flex-col gap-y-4 h-[800px]">
            <Text className="font-medium text-base">
              Add the email addresses to import, separated by whitespaces.
              Invited users will be able to login to this domain with their
              email address.
            </Text>
            <BulkAdd onSuccess={onSuccess} onFailure={onFailure} />
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <InvitedUserTable
                  pageOfUsers={pageOfUsers || []}
                  isLoading={isLoading}
                  error={error}
                  refresh={refresh}
                  hasNoData={noInvitedUsers}
                  setPopup={setPopup}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  goToPage={goToPage}
                />
              </div>
              <div className="sticky bottom-0 pt-3 pb-3 w-full border-t bg-background">
                <div className="flex justify-center">
                  {totalPages > 1 && (
                    <PageSelector
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default InviteUsersModal;
