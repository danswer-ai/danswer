"use client";

import AuthFlowContainer from "@/components/auth/AuthFlowContainer";
import { Button } from "@tremor/react";
import Link from "next/link";
import { FiLogIn } from "react-icons/fi";

const Page = () => {
  return (
    <AuthFlowContainer>
      <div className="flex flex-col space-y-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-text-900 text-center">
          Authentication Error
        </h2>
        <p className="text-text-700 text-center">
          We encountered an issue while attempting to log you in.
        </p>
        <div className="border border-border shadow p-4 rounded-lg">
          <ul className="list-disc text-left text-text-700 pl-6">
            <li>Your login credentials may be incorrect or outdated</li>
            <li>
              Our system might be experiencing temporary technical difficulties
            </li>
            <li>
              There could be an issue with your account's access permissions
            </li>
          </ul>
        </div>

        <Link href="/auth/login" className="w-full">
          <Button size="lg" icon={FiLogIn} color="indigo" className="w-full">
            Return to Login Page
          </Button>
        </Link>
        <p className="text-sm text-text-500 text-center">
          We recommend trying again. If you continue to experience problems,
          please reach out to your system administrator for assistance.
        </p>
      </div>
    </AuthFlowContainer>
  );
};

export default Page;
