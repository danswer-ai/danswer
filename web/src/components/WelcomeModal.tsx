"use client";

import { Button } from "@tremor/react";
import { Modal } from "./Modal";
import Link from "next/link";

export function WelcomeModal() {
  return (
    <Modal className="max-w-4xl">
      <div className="px-8 py-6">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border flex">
          Welcome to Danswer 🎉
        </h2>
        <div>
          <p className="mb-4">
            Danswer is the AI-powered search engine for your organization&apos;s
            internal knowledge. Whenever you need to find any piece of internal
            information, Danswer is there to help!
          </p>
          <p>
            To get started, the first step is to configure some{" "}
            <i>connectors</i>. Connectors are the way that Danswer gets data
            from your organization&apos;s various data sources. Once setup,
            we&apos;ll automatically sync data from your apps and docs into
            Danswer, so you can search all through all of them in one place.
          </p>
        </div>

        <div className="flex mt-3">
          <Link href="/admin/add-connector" className="mx-auto">
            <Button>Setup your first connector!</Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
