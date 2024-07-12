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
  handleClose?: () => void;
}

export function AdminSidebar({ collections, handleClose }: AdminSidebarProps) {
  return (
    <aside className="pl-4">
      <nav className="pl-2 space-y-2 md:pl-4">
        {collections.map((collection, collectionInd) => (
          <div key={collectionInd}>
            <h2 className="pb-2 text-xs font-bold text-strong ">
              <div>{collection.name}</div>
            </h2>
            {collection.items.map((item) => (
              <Link key={item.link} href={item.link} onClick={handleClose}>
                <button className="block w-48 px-2 py-2 text-sm text-left rounded hover:bg-hover">
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
