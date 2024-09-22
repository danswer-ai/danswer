"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";

const Page = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="font-bold">
        Unable to login, please try again and/or contact an administrator.
      </div>
      <Link href="/auth/login" className="w-fit">
        <Button className="mt-4">
          <LogIn size={16} /> Back to login
        </Button>
      </Link>
    </div>
  );
};

export default Page;
