import { SearchSection } from "@/components/search/SearchSection";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <div className="px-24 pt-10 flex flex-col items-center min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-[800px] w-full">
          <SearchSection />
        </div>
      </div>
    </>
  );
}
