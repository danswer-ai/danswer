"use client";

import Link from "next/link";
import enmeddLogo from "../../../public/logo-brand.png";
import Image from "next/image";
import { Wrapper } from "./wrapper";
import { useState } from "react";
import Menu from "./menu";

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState(false);

  const toggleMenu = () => {
    setOpenMenu((prev) => !prev);
  };

  return (
    <div className="fixed top-0 -translate-x-1/2 w-full left-1/2 bg-[rgba(255,_255,_255,_0.5)] z-notification flex items-center justify-center backdrop-blur-md">
      <Wrapper>
        <div className="relative flex items-center justify-between w-full py-4">
          <Link href="/">
            <Image src={enmeddLogo} alt="enmedd-logo" width={150} />
          </Link>

          <ul className="hidden gap-10 xl:flex">
            <li className="cursor-pointer">Solutions</li>
            <li className="cursor-pointer">Customers</li>
            <li className="cursor-pointer">Security</li>
            <li className="cursor-pointer">Pricing</li>
            <li className="cursor-pointer">Docs</li>
            <li className="cursor-pointer">Blog</li>
            <li className="cursor-pointer">Discord</li>
            <li className="cursor-pointer">Talk to us</li>
          </ul>

          <div className="items-center hidden gap-5 xl:flex">
            <Link href="auth/login">Log in</Link>
            <Link
              href="auth/signup"
              className="px-4 py-2 bg-[#2039F3] rounded-[5px] text-inverted"
            >
              Sign up
            </Link>
          </div>

          <div
            className="flex flex-col justify-center h-10 gap-1.5 md:gap-2 xl:hidden z-notification"
            onClick={toggleMenu}
          >
            <div
              className={`w-6 md:w-8 h-0.5 bg-background-inverted dark:bg-background transition-all duration-300 ease-in-out relative ${
                openMenu
                  ? "rotate-[45deg] md:rotate-[42deg] top-1 md:top-1.5"
                  : "rotate-0 top-0"
              }`}
            />
            <div
              className={`w-6 md:w-8 h-0.5 bg-background-inverted dark:bg-background transition-all duration-300 ease-in-out relative ${
                openMenu
                  ? "rotate-[-45deg] md:rotate-[-42deg] -top-1"
                  : "rotate-0 top-0"
              }`}
            />
          </div>
          {openMenu && <Menu />}
        </div>
      </Wrapper>
    </div>
  );
}
