import { PanelRightClose } from "lucide-react";
import { Button } from "./ui/button";
import Image from "next/image";
import Logo from "../../public/logo-brand.png";
import React from "react";

export default function TopBar({
  children,
  toggleLeftSideBar,
}: {
  children?: React.ReactNode;
  toggleLeftSideBar: () => void;
}) {
  return (
    <div className="fixed top-0 left-0 flex w-full z-top-bar bg-background">
      <div className="flex w-full items-start p-4 justify-between">
        <div className="flex lg:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleLeftSideBar}>
            <PanelRightClose size={24} />
          </Button>
          <Image src={Logo} alt="Logo" width={112} />
        </div>

        {children}
      </div>
    </div>
  );
}
