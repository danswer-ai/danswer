import { fetchChatData } from "@/lib/chat/fetchChatData";
import WrappedDocuments from "./WrappedDocuments";
import { redirect } from "next/navigation";

export default async function GalleryPage(props: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await fetchChatData(searchParams);

  if ("redirect" in data) {
    redirect(data.redirect);
  }

  const { chatSessions, toggleSidebar } = data;

  return (
    <WrappedDocuments
      initiallyToggled={toggleSidebar}
      chatSessions={chatSessions}
    />
  );
}
