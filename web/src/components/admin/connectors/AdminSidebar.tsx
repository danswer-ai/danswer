// Sidebar.tsx
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

export function AdminSidebar({ collections }: { collections: Collection[] }) {
  return (
    <aside className="pl-4">
      <nav className="space-y-2 pl-4">
        {collections.map((collection, collectionInd) => (
          <div key={collectionInd}>
            <h2 className="text-xs text-strong font-bold pb-2 ">
              <div>{collection.name}</div>
            </h2>
            {collection.items.map((item) => (
              <Link key={item.link} href={item.link}>
                <button className="text-sm block w-48 py-2 px-2 text-left hover:bg-hover rounded">
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
