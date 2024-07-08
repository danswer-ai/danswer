import Link from "next/link";
import enmeddLogo from "../../../public/logo-brand.png";
import Image from "next/image";
import { Wrapper } from "./wrapper";

export default function Navbar() {
  return (
    <Wrapper>
      <div className="flex items-center justify-between w-full py-4">
        <Image src={enmeddLogo} alt="enmedd-logo" width={150} />

        <ul className="flex gap-10">
          <li>Solutions</li>
          <li>Customers</li>
          <li>Security</li>
          <li>Pricing</li>
          <li>Docs</li>
          <li>Blog</li>
          <li>Discord</li>
          <li>Talk to us</li>
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
  );
}
