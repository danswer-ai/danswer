import { PanelRightClose } from "lucide-react";
import { Button } from "./ui/button";
import Image from "next/image";
import EnmeddLogo from "../../public/logo-brand.png";
import React from "react";
import { Logo } from "@/components/Logo";

export function TopBar({
  children,
  toggleLeftSideBar,
}: {
  children?: React.ReactNode;
  toggleLeftSideBar?: () => void;
}) {
  return (
    <div className="fixed top-0 left-0 flex lg:hidden w-full z-top-bar bg-background">
      <div className="flex w-full items-start p-4 justify-between">
        <div className="flex lg:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleLeftSideBar}>
            <PanelRightClose size={24} />
          </Button>
          <Image src={EnmeddLogo} alt="Logo" width={112} />
        </div>

        {children}
      </div>
    </div>
  );
}

export function WelcomeTopBar() {
  return (
    <div className="w-full py-6 bg-background">
      <Logo className="w-28 xl:w-32 ml-6 xl:ml-10" />
    </div>
  );
}
