"use client";

import { EmbeddingFormProvider } from "@/components/context/EmbeddingContext";
import EmbeddingSidebar from "./EmbeddingSidebar";
import EmbeddingForm from "./EmbeddingForm";

export default function EmbeddingWrapper() {
  return (
    <EmbeddingFormProvider>
      <div className="flex justify-center w-full h-full">
        <EmbeddingSidebar />
        <div className="mt-12 w-full max-w-5xl mx-auto">
          <EmbeddingForm />
        </div>
      </div>
    </EmbeddingFormProvider>
  );
}
