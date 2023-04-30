// Sidebar.tsx
import React from "react";
import Link from "next/link";

interface Item {
  name: string;
  link: string;
}

interface Collection {
  name: string;
  items: Item[];
}

interface SidebarProps {
  title: string;
  collections: Collection[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collections }) => {
  return (
    <aside className="w-64 bg-gray-800 text-gray-100">
      <Link href="/admin/connectors/slack">
        <h1 className="text-2xl font-bold p-6 mx-auto">danswer 💃</h1>
      </Link>
      <nav className="space-y-2">
        {collections.map((collection, collectionInd) => (
          <div key={collectionInd}>
            <h2 className="text-lg font-bold px-6 pb-2 border-solid border-slate-600 border-b">
              {collection.name}
            </h2>
            {collection.items.map((item, itemInd) => (
              <Link href={item.link}>
                <button
                  key={itemInd}
                  className="text-sm block w-full px-10 py-2 text-left font-bold hover:bg-gray-700 border-solid border-slate-600 border-b"
                >
                  {item.name}
                </button>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};
