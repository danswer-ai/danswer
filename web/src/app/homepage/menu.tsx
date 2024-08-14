import Link from "next/link";
import enmeddLogo from "../../../public/logo.png";
import Image from "next/image";

export default function Menu() {
  return (
    <div
      className="fixed top-0 right-0 w-full h-screen p-6 pt-24 pb-10 text-dark-900 bg-white md:w-96 z-1000"
      style={{
        boxShadow:
          "0px 3px 5px -1px #00000033, 0px 1px 18px 0px #0000001F, 0px 6px 10px 0px #00000024",
      }}
    >
      <div className="relative w-full">
        <Image
          src={enmeddLogo}
          alt="enmedd-logo"
          width={50}
          height={50}
          className="fixed top-4"
        />
        <div className="flex flex-col gap-10">
          <ul className="flex flex-col items-start gap-6 font-semibold text-dark-900">
            <li className="cursor-pointer">Solutions</li>
            <li className="cursor-pointer">Customers</li>
            <li className="cursor-pointer">Security</li>
            <li className="cursor-pointer">Pricing</li>
            <li className="cursor-pointer">Docs</li>
            <li className="cursor-pointer">Blog</li>
            <li className="cursor-pointer">Discord</li>
            <li className="cursor-pointer">Talk to us</li>
          </ul>

          <div className="flex items-center justify-center gap-12 py-10 border-t">
            <Link href="auth/login" className="px-6 py-2">
              Log in
            </Link>
            <Link
              href="auth/signup"
              className="px-10 py-2 bg-[#2039F3] rounded-[5px] text-white"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
