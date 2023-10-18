import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { PageSelector } from "@/components/PageSelector";
import { DocumentBoostStatus } from "@/lib/types";
import { updateBoost, updateHiddenStatus } from "./lib";
import { CheckmarkIcon, EditIcon } from "@/components/icons/icons";
import { numToDisplay } from "./constants";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import { getErrorMsg } from "@/lib/fetchUtils";
import { HoverPopup } from "@/components/HoverPopup";

const IsHiddenSection = ({
  document,
  onUpdate,
}: {
  document: DocumentBoostStatus;
  onUpdate: (response: Response) => void;
}) => {
  return (
    <HoverPopup
      mainContent={
        document.hidden ? (
          <div
            onClick={async () => {
              const response = await updateHiddenStatus(
                document.document_id,
                false
              );
              onUpdate(response);
            }}
            className="flex text-red-700 cursor-pointer hover:bg-gray-700 py-1 px-2 w-fit rounded-full"
          >
            <div className="select-none">Hidden</div>
            <FiEyeOff className="my-auto ml-1" />
          </div>
        ) : (
          <div
            onClick={async () => {
              const response = await updateHiddenStatus(
                document.document_id,
                true
              );
              onUpdate(response);
            }}
            className="flex text-gray-400 cursor-pointer hover:bg-gray-700 py-1 px-2 w-fit rounded-full"
          >
            <div className="text-gray-400 my-auto select-none">Visible</div>
            <FiX className="my-auto ml-1" />
          </div>
        )
      }
      popupContent={
        <div className="text-xs text-gray-300">
          {document.hidden ? (
            <div className="flex">
              <FiEye className="my-auto mr-1" /> Unhide
            </div>
          ) : (
            <div className="flex">
              <FiEyeOff className="my-auto mr-1" />
              Hide
            </div>
          )}
        </div>
      }
      direction="left"
    />
  );
};

const ScoreSection = ({
  documentId,
  initialScore,
  setPopup,
  refresh,
}: {
  documentId: string;
  initialScore: number;
  setPopup: (popupSpec: PopupSpec | null) => void;
  refresh: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(initialScore.toString());

  const onSubmit = async () => {
    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      setPopup({
        message: "Score must be a number",
        type: "error",
      });
      return;
    }

    const errorMsg = await updateBoost(documentId, numericScore);
    if (errorMsg) {
      setPopup({
        message: errorMsg,
        type: "error",
      });
    } else {
      setPopup({
        message: "Updated score!",
        type: "success",
      });
      refresh();
      setIsOpen(false);
    }
  };

  if (isOpen) {
    return (
      <div className="m-auto flex">
        <input
          value={score}
          onChange={(e) => {
            setScore(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSubmit();
            }
            if (e.key === "Escape") {
              setIsOpen(false);
              setScore(initialScore.toString());
            }
          }}
          className="border bg-slate-700 text-gray-200 border-gray-300 rounded py-1 px-3 w-16"
        />
        <div onClick={onSubmit} className="cursor-pointer my-auto ml-2">
          <CheckmarkIcon size={20} className="text-green-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex my-auto">
        <div className="w-6 flex">
          <div className="ml-auto">{initialScore}</div>
        </div>
        <div className="cursor-pointer ml-2" onClick={() => setIsOpen(true)}>
          <EditIcon size={20} />
        </div>
      </div>
    </div>
  );
};

export const DocumentFeedbackTable = ({
  documents,
  refresh,
}: {
  documents: DocumentBoostStatus[];
  refresh: () => void;
}) => {
  const [page, setPage] = useState(1);
  const { popup, setPopup } = usePopup();

  return (
    <div>
      {popup}
      <BasicTable
        columns={[
          {
            header: "Document Name",
            key: "name",
          },
          {
            header: "Is Hidden?",
            key: "hidden",
          },
          {
            header: "Score",
            key: "score",
            alignment: "right",
          },
        ]}
        data={documents
          .slice((page - 1) * numToDisplay, page * numToDisplay)
          .map((document) => {
            return {
              name: (
                <a
                  className="text-blue-600"
                  href={document.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {document.semantic_id}
                </a>
              ),
              hidden: (
                <IsHiddenSection
                  document={document}
                  onUpdate={async (response) => {
                    if (response.ok) {
                      refresh();
                    } else {
                      setPopup({
                        message: `Error updating hidden status - ${getErrorMsg(
                          response
                        )}`,
                        type: "error",
                      });
                    }
                  }}
                />
              ),
              score: (
                <div className="ml-auto flex w-16">
                  <div key={document.document_id} className="h-10 ml-auto mr-8">
                    <ScoreSection
                      documentId={document.document_id}
                      initialScore={document.boost}
                      refresh={refresh}
                      setPopup={setPopup}
                    />
                  </div>
                </div>
              ),
            };
          })}
      />
      <div className="mt-3 flex">
        <div className="mx-auto">
          <PageSelector
            totalPages={Math.ceil(documents.length / numToDisplay)}
            currentPage={page}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>
    </div>
  );
};
