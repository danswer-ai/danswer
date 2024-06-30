import { FiPlusSquare } from "react-icons/fi";
import Link from "next/link";
import { Divider, Title } from "@tremor/react";

export default function AssistantsCreator() {
    return (
    <>
        <Divider />

        <Title>Create an Assistant</Title>
        <Link
          href="/admin/assistants/new"
          className="flex py-2 px-4 mt-2 border border-border h-fit cursor-pointer hover:bg-hover text-sm w-40"
        >
          <div className="mx-auto flex">
            <FiPlusSquare className="my-auto mr-2" />
            New Assistant
          </div>
        </Link>

        <Divider />
    </>);

}