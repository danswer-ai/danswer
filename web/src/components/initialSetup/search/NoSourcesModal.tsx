"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { MessageSquare, Share2 } from "lucide-react";
import { CustomModal } from "@/components/CustomModal";
import { Divider } from "@/components/Divider";

export function NoSourcesModal() {
  const settings = useContext(SettingsContext);
  const [isHidden, setIsHidden] = useState(
    !settings?.settings.search_page_enabled ?? false
  );

  if (isHidden) {
    return null;
  }

  return (
    <CustomModal
      open={!isHidden}
      onClose={() => setIsHidden(true)}
      trigger={null}
      title="🧐 No sources connected"
    >
      <div>
        <p>
          Before using Search you&apos;ll need to connect at least one source.
          Without any connected knowledge sources, there isn&apos;t anything to
          search over.
        </p>
        <Link href="/admin/data-sources">
          <Button className="mt-3">
            <Share2 size={16} /> Connect a Source!
          </Button>
        </Link>
        <Divider />
        <div>
          <p>
            Or, if you&apos;re looking for a pure ChatGPT-like experience
            without any organization specific knowledge, then you can head over
            to the Chat page and start chatting with enMedD AI right away!
          </p>
          <Link href="/chat">
            <Button className="mt-3">
              <MessageSquare size={16} /> Start Chatting!
            </Button>
          </Link>
        </div>
      </div>
    </CustomModal>
  );
}
