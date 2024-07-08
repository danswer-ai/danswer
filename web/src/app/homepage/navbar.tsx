import Link from "next/link";
import enmeddLogo from "../../../public/logo-brand.png";
import Image from "next/image";
import { Wrapper } from "./wrapper";

export default function Navbar() {
  return (
    <div className="fixed top-0 -translate-x-1/2 w-full left-1/2 bg-[rgba(255,_255,_255,_0.5)] z-[9999] flex items-center justify-center backdrop-blur-md">
      <Wrapper>
        <div className="flex items-center justify-between w-full py-4">
          <Image src={enmeddLogo} alt="enmedd-logo" width={150} />

          <ul className="flex gap-10">
            <li className="cursor-pointer">Solutions</li>
            <li className="cursor-pointer">Customers</li>
            <li className="cursor-pointer">Security</li>
            <li className="cursor-pointer">Pricing</li>
            <li className="cursor-pointer">Docs</li>
            <li className="cursor-pointer">Blog</li>
            <li className="cursor-pointer">Discord</li>
            <li className="cursor-pointer">Talk to us</li>
          </ul>

          <div className="flex items-center gap-5">
            <Link href="auth/login">Log in</Link>
            <Link
              href="auth/signup"
              className="px-4 py-2 bg-[#2039F3] rounded-[5px] text-white"
            >
              Sign up
            </Link>
          </div>
        </div>
      </Wrapper>
    </div>
  );
}
