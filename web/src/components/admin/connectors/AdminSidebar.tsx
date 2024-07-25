// Sidebar.tsx
"use client";
import React, { useContext } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED } from "@/lib/constants";
import { HeaderTitle } from "@/components/header/Header";
import { SettingsContext } from "@/components/settings/SettingsProvider";

interface Item {
  name: string | JSX.Element;
  link: string;
}

interface Collection {
  name: string | JSX.Element;
  items: Item[];
}

export function AdminSidebar({ collections }: { collections: Collection[] }) {
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const enterpriseSettings = combinedSettings.enterpriseSettings;

  return (
    <aside className="pl-0">
      <nav className="space-y-2 mx-4">
        <div className="pb-12 flex">
          <div className="fixed left-0 top-0 py-2 px-4 w-[300px]">
            <Link
              className="flex flex-col"
              href={
                settings && settings.default_page === "chat"
                  ? "/chat"
                  : "/search"
              }
            >
              <div className="flex gap-x-1 my-auto">
                <div className="my-auto">
                  <Logo />
                </div>
                <div className="my-auto">
                  {enterpriseSettings && enterpriseSettings.application_name ? (
                    <div>
                      <HeaderTitle>
                        {enterpriseSettings.application_name}
                      </HeaderTitle>
                      {!NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED && (
                        <p className="text-xs text-subtle -mt-1.5">
                          Powered by Danswer
                        </p>
                      )}
                    </div>
                  ) : (
                    <HeaderTitle>Danswer</HeaderTitle>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </div>
        {collections.map((collection, collectionInd) => (
          <div className="mx-2" key={collectionInd}>
            <h2 className="text-xs text-strong font-bold pb-2">
              <div>{collection.name}</div>
            </h2>
            {collection.items.map((item) => (
              <Link key={item.link} href={item.link}>
                <button className="text-sm block w-full py-2.5 px-2 text-left hover:bg-hover rounded">
                  <div className="">{item.name}</div>
                </button>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
