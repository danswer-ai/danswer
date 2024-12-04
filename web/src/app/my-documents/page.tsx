import { fetchChatData } from "@/lib/chat/fetchChatData";
import WrappedDocuments from "./WrappedDocuments";
import { redirect } from "next/navigation";

export default async function GalleryPage(props: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const searchParams = await props.searchParams;
  //   noStore();

  const data = await fetchChatData(searchParams);

  if ("redirect" in data) {
    redirect(data.redirect);
  }

  const { chatSessions, folders, openedFolders, toggleSidebar } = data;

  return (
    <WrappedDocuments
      initiallyToggled={toggleSidebar}
      chatSessions={chatSessions}
      folders={folders}
      openedFolders={openedFolders}
    />
  );
}
