import React from "react";
import "tailwindcss/tailwind.css";

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 text-gray-200 py-4">
      <div className="container mx-auto ml-8">
        <h1 className="text-2xl font-bold">danswer 💃</h1>
      </div>
    </header>
  );
};
