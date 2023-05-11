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

interface SidebarProps {
  title: string;
  collections: Collection[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collections }) => {
  return (
    <aside className="w-64 bg-gray-900 text-gray-100 pl-4">
      <nav className="space-y-2 pl-4">
        {collections.map((collection, collectionInd) => (
          <div key={collectionInd}>
            <h2 className="text-md font-bold pb-2 ">
              <div>{collection.name}</div>
            </h2>
            {collection.items.map((item) => (
              <Link key={item.link} href={item.link}>
                <button className="text-sm block w-full py-2 pl-2 text-left border-l border-gray-800">
                  <div className="text-gray-400 hover:text-gray-300">
                    {item.name}
                  </div>
                </button>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};
