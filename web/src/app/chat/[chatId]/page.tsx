import ChatPage from "../ChatPage";

export default async function Page({
  params,
  searchParams,
}: {
  params: { chatId: string };
  searchParams: { shouldhideBeforeScroll?: string };
}) {
  return await ChatPage({
    chatId: params.chatId,
    shouldhideBeforeScroll: searchParams.shouldhideBeforeScroll === "true",
  });
}
