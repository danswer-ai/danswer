// Sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";

interface Item {
  name: string | JSX.Element;
  link: string;
}

interface Collection {
  name: string | JSX.Element;
  items: Item[];
}

interface AdminSidebarProps {
  collections: Collection[];
}

export function AdminSidebar({ collections }: AdminSidebarProps) {
  return (
    <aside className="w-full">
      <nav className="space-y-4 h-full">
        {collections.map((collection, collectionInd) => (
          <div key={collectionInd}>
            <h2 className="pb-2 px-4 font-semibold text-dark-900">
              {collection.name}
            </h2>
            {collection.items.map((item) => (
              <Link key={item.link} href={item.link}>
                <div className="flex px-4 py-2 h-10 w-full rounded-regular cursor-pointer hover:bg-hover-light items-center gap-2 text-sm">
                  {item.name}
                </div>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
