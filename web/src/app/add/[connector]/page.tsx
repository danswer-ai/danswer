import Cookies from "js-cookie";
import WrappedPage from "./Wrapper";
import { SIDEBAR_TOGGLED_COOKIE_NAME } from "@/components/resizable/contants";
import { cookies } from "next/headers";
import { getCurrentUserSS } from "@/lib/userSS";
import { User } from "@/lib/types";

export default async function Page({
  params,
}: {
  params: { connector: string };
}) {
  return <WrappedPage connector={params.connector} />;
}
