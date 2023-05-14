import { SearchSection } from "@/components/search/SearchSection";
import { Header } from "@/components/Header";
import { getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUserSS();
  if (!user) {
    return redirect("/auth/login");
  }
  return (
    <>
      <Header user={user} />
      <div className="px-24 pt-10 flex flex-col items-center min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-[800px] w-full">
          <SearchSection />
        </div>
      </div>
    </>
  );
}
