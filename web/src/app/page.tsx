import { Inter } from "next/font/google";
import { SearchSection } from "@/components/SearchBar";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <>
      <Header />
      <div className="p-24 flex flex-col items-center min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-[800px] w-full">
          <SearchSection />
        </div>
      </div>
    </>
  );
}
