"use client";

import { REGISTRATION_URL } from "@/lib/constants";
import { Button } from "@tremor/react";
import Link from "next/link";
import { FiLogIn } from "react-icons/fi";

const Page = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="font-bold text-text-800 text-center max-w-md mx-auto mb-6">
        Your account does not exist in our records. Make sure you have been
        invited to a Danswer organization or have created one yourself.
      </div>
      <Link href={`${REGISTRATION_URL}/register`} className="w-fit">
        <Button className="mt-4" size="xs" icon={FiLogIn} color="indigo">
          Create a new Danswer Organization
        </Button>
      </Link>
    </div>
  );
};

export default Page;
