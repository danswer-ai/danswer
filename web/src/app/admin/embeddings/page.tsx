"use client";

import { EmbeddingFormProvider } from "@/context/EmbeddingContext";
import EmbeddingStepper from "../../../components/embedding/EmbeddingStepper";
import EmbeddingForm from "./pages/EmbeddingFormPage";
import { BackButton } from "@/components/BackButton";

export default function EmbeddingWrapper() {
  return (
    <EmbeddingFormProvider>
      <div className="w-full h-full overflow-y-auto">
        <div className="container mx-auto">
          <BackButton />
          <EmbeddingStepper />
          <EmbeddingForm />
        </div>
      </div>
    </EmbeddingFormProvider>
  );
}
