"use client";

import { Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { SlackForm } from "@/components/admin/connectors/SlackForm";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <>
      <Header />
      <div className="p-24 min-h-screen bg-gray-900 text-gray-100">
        <div>
          <h1 className="text-4xl font-bold mb-4">Slack</h1>
        </div>
        <h2 className="text-3xl font-bold mb-4 ml-auto mr-auto">Config</h2>
        <SlackForm onSubmit={(success) => console.log(success)} />
      </div>
    </>
  );
}
