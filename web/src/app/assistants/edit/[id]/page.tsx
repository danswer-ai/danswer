import { ErrorCallout } from "@/components/ErrorCallout";
import { Card } from "@tremor/react";
import { HeaderWrapper } from "@/components/header/HeaderWrapper";
import { FiChevronLeft } from "react-icons/fi";
import Link from "next/link";
import { AssistantEditor } from "@/app/admin/assistants/AssistantEditor";
import { SuccessfulPersonaUpdateRedirectType } from "@/app/admin/assistants/enums";
import { fetchPersonaEditorInfoSS } from "@/lib/assistants/fetchPersonaEditorInfoSS";

export default async function Page({ params }: { params: { id: string } }) {
  const [values, error] = await fetchPersonaEditorInfoSS(params.id);

  let body;
  if (!values) {
    body = (
      <div className="px-32">
        <ErrorCallout errorTitle="Something went wrong :(" errorMsg={error} />
      </div>
    );
  } else {
    body = (
      <div className="w-full my-16">
        <div className="px-32">
          <div className="mx-auto container">
            <Card>
              <AssistantEditor
                {...values}
                defaultPublic={false}
                redirectType={SuccessfulPersonaUpdateRedirectType.CHAT}
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeaderWrapper>
        <div className="h-full flex flex-col">
          <div className="flex my-auto">
            <Link href="/chat">
              <FiChevronLeft
                className="mr-1 my-auto p-1 hover:bg-hover rounded cursor-pointer"
                size={32}
              />
            </Link>
            <h1 className="flex text-xl text-strong font-bold my-auto">
              Edit Assistant
            </h1>
          </div>
        </div>
      </HeaderWrapper>

      {body}
    </div>
  );
}
