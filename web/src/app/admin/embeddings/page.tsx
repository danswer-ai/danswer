// "use client";

// import { EmbeddingFormProvider } from "@/context/EmbeddingContext";
// import EmbeddingSidebar from "../../../components/embedding/EmbeddingSidebar";
// import EmbeddingForm from "./pages/EmbeddingFormPage";

// export default function EmbeddingWrapper() {
//   return (
//     <EmbeddingFormProvider>
//       <div className="flex justify-center w-full h-full">
//         <EmbeddingSidebar />
//         <div className="mt-12 w-full max-w-5xl mx-auto">
//           <EmbeddingForm />
//         </div>
//       </div>
//     </EmbeddingFormProvider>
//   );
// }
"use client";

import { EmbeddingFormProvider } from "@/context/EmbeddingContext";
import EmbeddingStepper from "../../../components/embedding/EmbeddingStepper";
import EmbeddingForm from "./pages/EmbeddingFormPage";

export default function EmbeddingWrapper() {
  return (
    <EmbeddingFormProvider>
      <div className="w-full h-full overflow-y-auto">
      <div className="container mx-auto">
        <EmbeddingStepper />
        <EmbeddingForm />
        </div>
      </div>
    </EmbeddingFormProvider>
  );
}