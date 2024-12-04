import { useState } from "react";

import InvitedUserTable from "@/components/admin/users/InvitedUserTable";
import BulkAdd from "@/components/admin/users/BulkAdd";
import Text from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { FiPlusSquare } from "react-icons/fi";
import { PopupSpec } from "@/components/admin/connectors/Popup";

import { mutate } from "swr";

const InviteUsersModal = ({
  setPopup,
  q,
}: {
  setPopup: (spec: PopupSpec) => void;
  q: string;
}) => {
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
        variant="submit"
        onClick={() => setModal(true)}
      >
        <div className="flex">
          <FiPlusSquare className="my-auto mr-2" />
          Invite Users
        </div>
      </Button>

      {modal && (
        <Modal title="Bulk Add Users" onOutsideClick={() => setModal(false)}>
          <div className="flex flex-col gap-y-4">
            <Text className="font-medium text-base">
              Add the email addresses to import, separated by whitespaces.
              Invited users will be able to login to this domain with their
              email address.
            </Text>
            <BulkAdd onSuccess={onSuccess} onFailure={onFailure} />
            <InvitedUserTable setPopup={setPopup} q={q} />
          </div>
        </Modal>
      )}
    </>
  );
};

export default InviteUsersModal;
