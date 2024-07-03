import { BookmarkIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import { Button, Text } from "@tremor/react";
import Link from "next/link";
import DocumentsSets from "@/components/adminPageComponents/documents/AdminDocumetsSets";

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle icon={<BookmarkIcon size={32} />} title="Document Sets" />
      <Text className="mb-3">
        <b>Document Sets</b> allow you to group logically connected documents
        into a single bundle. These can then be used as filter when performing
        searches in the web UI or attached to slack bots to limit the amount of
        information the bot searches over when answering in a specific channel
        or with a certain command.
      </Text>

      <div className="mb-3"></div>

      <div className="flex mb-6">
        <Link href="/admin/documents/sets/new">
          <Button size="xs" color="green" className="ml-2 my-auto">
            New Document Set
          </Button>
        </Link>
      </div>
      <DocumentsSets />
    </div>
  );
};

export default Page;
