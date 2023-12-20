import ChatPage from "./ChatPage";

export default async function Page({
  searchParams,
}: {
  searchParams: { shouldhideBeforeScroll?: string };
}) {
  return await ChatPage({
    chatId: null,
    shouldhideBeforeScroll: searchParams.shouldhideBeforeScroll === "true",
  });
}
