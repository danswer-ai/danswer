"use client";
import { FormProvider } from "@/components/context/FormContext";
import Sidebar from "../../connectors/[connector]/Sidebar";
import { EmbeddingModelSelection } from "./EmbeddingModelSelectionForm";
import { SIDEBAR_WIDTH } from "@/lib/constants";

export default function EmbeddingWrapper() {
  return (
    <FormProvider connector={"file"}>
      <div className=" flex justify-center w-full h-full">
        <div className="mt-12 w-full  mx-auto">
          <EmbeddingModelSelection />
        </div>
      </div>
    </FormProvider>
  );
}
