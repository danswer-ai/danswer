import { useState } from "react";
import { ChatSessionSharedStatus } from "../interfaces";
import { CopyButton } from "@/components/CopyButton";
import { Copy, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CustomModal } from "@/components/CustomModal";
import { CustomTooltip } from "@/components/CustomTooltip";
import { useToast } from "@/hooks/use-toast";

function buildShareLink(chatSessionId: number) {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/chat/shared/${chatSessionId}`;
}

async function generateShareLink(chatSessionId: number) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sharing_status: "public" }),
  });

  if (response.ok) {
    return buildShareLink(chatSessionId);
  }
  return null;
}

async function deleteShareLink(chatSessionId: number) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sharing_status: "private" }),
  });

  return response.ok;
}

export function ShareChatSessionModal({
  chatSessionId,
  existingSharedStatus,
  onShare,
  onPopover,
}: {
  chatSessionId: number;
  existingSharedStatus: ChatSessionSharedStatus;
  onShare?: (shared: boolean) => void;
  onPopover?: boolean;
}) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [linkGenerating, setLinkGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<string>(
    existingSharedStatus === ChatSessionSharedStatus.Public
      ? buildShareLink(chatSessionId)
      : ""
  );
  const { toast } = useToast();

  return (
    <CustomModal
      title="Share link to Chat"
      trigger={
        onPopover ? (
          <div
            onClick={() => setIsShareModalOpen(true)}
            className="relative flex cursor-pointer select-none items-center gap-1.5 rounded-sm px-3 py-2.5 text-sm outline-none transition-colors hover:bg-brand-500 hover:text-inverted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <Share className="mr-2" size={16} />
            Share
          </div>
        ) : (
          <CustomTooltip
            trigger={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShareModalOpen(true)}
              >
                <Share size={20} />
              </Button>
            }
          >
            Share
          </CustomTooltip>
        )
      }
      onClose={() => setIsShareModalOpen(false)}
      open={isShareModalOpen}
    >
      {shareLink ? (
        <div>
          <p>
            This chat session is currently shared. Anyone at your organization
            can view the message history using the following link:
          </p>

          <div className="flex py-2 items-center gap-2">
            <CopyButton content={shareLink} />
            <Link
              href={shareLink}
              target="_blank"
              className="underline text-link text-sm"
            >
              {shareLink}
            </Link>
          </div>

          <p className="mb-4">
            Click the button below to make the chat private again.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsShareModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setLinkGenerating(true);

                const success = await deleteShareLink(chatSessionId);
                if (success) {
                  setShareLink("");
                  onShare && onShare(false);
                  toast({
                    title: "Share link deleted",
                    description:
                      "The share link has been successfully deleted.",
                    variant: "success",
                  });
                } else {
                  toast({
                    title: "Failed to delete share link",
                    description: "There was an issue deleting the share link.",
                    variant: "destructive",
                  });
                }

                setLinkGenerating(false);
              }}
              variant="destructive"
            >
              Delete Share Link
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="pb-6">
            <span className="font-bold">Warning</span>
            <p className="pt-2">
              Ensure that all content in the chat is safe to share with the
              whole organization. The content of the retrieved documents will
              not be visible, but the names of cited documents as well as the AI
              and human messages will be visible.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsShareModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setLinkGenerating(true);

                // NOTE: for "inescure" non-https setup, the `navigator.clipboard.writeText` may fail
                // as the browser may not allow the clipboard to be accessed.
                try {
                  const shareLink = await generateShareLink(chatSessionId);
                  if (!shareLink) {
                    toast({
                      title: "Failed to generate share link",
                      description:
                        "There was an issue generating the share link.",
                      variant: "destructive",
                    });
                  } else {
                    setShareLink(shareLink);
                    onShare && onShare(true);
                    navigator.clipboard.writeText(shareLink);
                    toast({
                      title: "Share link generated and copied",
                      description:
                        "The share link has been successfully copied to the clipboard.",
                      variant: "success",
                    });
                  }
                } catch (e) {
                  console.error(e);
                  toast({
                    title: "Error",
                    description:
                      "An unexpected error occurred while generating the share link.",
                    variant: "destructive",
                  });
                }

                setLinkGenerating(false);
              }}
            >
              <Copy size={16} /> Generate and Copy Share Link
            </Button>
          </div>
        </div>
      )}
    </CustomModal>
  );
}
