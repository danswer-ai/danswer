"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { ClipboardIcon } from "@/components/icons/icons";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useStandardAnswers } from "./hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Button, Text } from "@tremor/react";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import Link from "next/link";

const Main = () => {
  const { popup, setPopup } = usePopup();
  const {
    data: standardAnswers,
    error: standardAnswersError,
    isLoading: standardAnswersIsLoading,
    refreshStandardAnswers,
  } = useStandardAnswers();

  if (standardAnswersIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (standardAnswersError || !standardAnswers) {
    return (
      <ErrorCallout
        errorTitle="Error loading standard answers"
        errorMsg={
          standardAnswersError.info?.message ||
          standardAnswersError.message.info?.detail
        }
      />
    );
  }

  return (
    <div className="mb-8">
      {popup}

      <Text className="mb-2">
        Here you can manage the standard answers that are used to answer
        questions based on keywords or phrases.
      </Text>
      {standardAnswers.length == 0 && (
        <Text className="mb-2">Add your first standard answer below!</Text>
      )}
      <div className="mb-2"></div>

      <Link className="flex mb-3" href="/admin/standard-answer/new">
        <Button className="my-auto" color="green" size="xs">
          New Standard Answer
        </Button>
      </Link>
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ClipboardIcon size={32} />}
        title="Standard Answers"
      />
      <Main />
    </div>
  );
};

export default Page;
