import React, { useState } from 'react';
import { LoadingAnimation } from "@/components/Loading";
import { Button, Divider, Text, Callout } from "@tremor/react";
import { Form, Formik } from "formik";
import { FiTrash } from "react-icons/fi";

import { EMBEDDING_PROVIDERS_ADMIN_URL } from '../../llm/constants';
import {
    SelectorFormField,
    TextFormField,
} from "@/components/admin/connectors/Field";
import { useSWRConfig } from "swr";

import { PopupSpec } from "@/components/admin/connectors/Popup";
import * as Yup from "yup";
import isEqual from "lodash/isEqual";
import { Modal } from "@/components/Modal";
import { buildUrl } from '@/lib/utilsSS';

// export function CloudEmbeddingProviderUpdateForm({
//     selectedProvider,
//     onClose,
//     existingProvider,
//     setPopup,
// }: {
//     selectedProvider: Embedding;
//     onClose: () => void;
//     existingProvider?: FullCloudEmbeddingProvider;
//     setPopup?: (popup: PopupSpec) => void;
// }) {
//     const { mutate } = useSWRConfig();

//     const [isTesting, setIsTesting] = useState(false);
//     const [testError, setTestError] = useState<string>("");

//     const initialValues: FullCloudEmbeddingProvider = {
//         ...selectedProvider,
//         api_key: existingProvider?.api_key ?? "",
//         api_base: existingProvider?.api_base ?? "",
//         api_version: existingProvider?.api_version ?? "",
//         custom_config: existingProvider?.custom_config ?? {},
//         default_model_name: existingProvider?.default_model_name ?? "",
//         model_names: existingProvider?.model_names ?? [],
//         is_configured: existingProvider?.is_configured ?? false,
//         is_default_provider: existingProvider?.is_default_provider ?? false,
//     };

//     const validationSchema = Yup.object({
//         name: Yup.string().required("Display Name is required"),
//         api_key: Yup.string().required("API Key is required"),
//         default_model_name: Yup.string().required("Default Model is required"),
//         model_names: Yup.array().of(Yup.string()).min(1, "At least one model must be selected"),
//     });

//     return (
//         <Formik
//             initialValues={initialValues}
//             validationSchema={validationSchema}
//             onSubmit={async (values, { setSubmitting }) => {
//                 setSubmitting(true);

//                 if (!isEqual(values, initialValues)) {
//                     setIsTesting(true);
//                     // Implement a test API call here if needed
//                     setIsTesting(false);
//                 }

//                 const response = await fetch(EMBEDDING_PROVIDERS_ADMIN_URL, {
//                     method: "PUT",
//                     headers: {
//                         "Content-Type": "application/json",
//                     },
//                     body: JSON.stringify(values),
//                 });

//                 if (!response.ok) {
//                     const errorMsg = await response.text();
//                     const fullErrorMsg = existingProvider
//                         ? `Failed to update provider: ${errorMsg}`
//                         : `Failed to enable provider: ${errorMsg}`;
//                     setPopup?.({
//                         type: "error",
//                         message: fullErrorMsg,
//                     });
//                     return;
//                 }

//                 mutate(EMBEDDING_PROVIDERS_ADMIN_URL);
//                 onClose();

//                 const successMsg = existingProvider
//                     ? "Provider updated successfully!"
//                     : "Provider enabled successfully!";
//                 setPopup?.({
//                     type: "success",
//                     message: successMsg,
//                 });

//                 setSubmitting(false);
//             }}
//         >
//             {({ values }) => (
//                 <Form>
//                     <TextFormField
//                         name="name"
//                         label="Display Name"
//                         subtext="A name which you can use to identify this provider when selecting it in the UI."
//                         placeholder="Display Name"
//                         disabled={!!existingProvider}
//                     />

//                     <Divider />

//                     <TextFormField
//                         name="api_key"
//                         label="API Key"
//                         placeholder="API Key"
//                         type="password"
//                     />

//                     <TextFormField
//                         name="api_base"
//                         label="API Base"
//                         placeholder="API Base"
//                     />

//                     <TextFormField
//                         name="api_version"
//                         label="API Version"
//                         placeholder="API Version"
//                     />

//                     <Divider />

//                     <SelectorFormField
//                         name="default_model_name"
//                         subtext="The model to use by default for this provider unless otherwise specified."
//                         label="Default Model"
//                         options={values.model_names.map((name: string) => ({
//                             name,
//                             value: name,
//                         }))}
//                         maxHeight="max-h-56"
//                     />

//                     <SelectorFormField
//                         name="model_names"
//                         subtext="Select the models you want to enable for this provider."
//                         label="Available Models"
//                         options={values.model_names.map((name: string) => ({
//                             name,
//                             value: name,
//                         }))}
//                         maxHeight="max-h-56"
//                     />

//                     <Divider />

//                     <Callout title="IMPORTANT" color="blue" className="mt-4">
//                         <div className="flex flex-col gap-y-2">
//                             <Text>You will need to retrieve your API credentials for this update.</Text>
//                             <a href={selectedProvider.apiLink} target="_blank" rel="noopener noreferrer" className="underline cursor-pointer">
//                                 Learn more about {selectedProvider.name} API credentials
//                             </a>
//                         </div>
//                     </Callout>

//                     {selectedProvider.costslink && (
//                         <Text className="text-sm mt-4">
//                             Please note that using this service will incur costs.
//                             <a href={selectedProvider.costslink} target="_blank" rel="noopener noreferrer" className="underline cursor-pointer ml-1">
//                                 Learn more about costs
//                             </a>
//                         </Text>
//                     )}

//                     <div>
//                         {testError && <Text className="text-error mt-2">{testError}</Text>}

//                         <div className="flex w-full mt-4">
//                             <Button type="submit" size="xs">
//                                 {isTesting ? (
//                                     <LoadingAnimation text="Testing" />
//                                 ) : existingProvider ? (
//                                     "Update"
//                                 ) : (
//                                     "Enable"
//                                 )}
//                             </Button>
//                             {existingProvider && (
//                                 <Button
//                                     type="button"
//                                     color="red"
//                                     className="ml-3"
//                                     size="xs"
//                                     icon={FiTrash}
//                                     onClick={async () => {
//                                         const response = await fetch(
//                                             `${EMBEDDING_PROVIDERS_ADMIN_URL}/${existingProvider.id}`,
//                                             {
//                                                 method: "DELETE",
//                                             }
//                                         );
//                                         if (!response.ok) {
//                                             const errorMsg = await response.text();
//                                             setPopup?.({
//                                                 type: "error",
//                                                 message: `Failed to delete provider: ${errorMsg}`,
//                                             });
//                                             return;
//                                         }

//                                         mutate(EMBEDDING_PROVIDERS_ADMIN_URL);
//                                         onClose();
//                                     }}
//                                 >
//                                     Delete
//                                 </Button>
//                             )}
//                         </div>
//                     </div>
//                 </Form>
//             )}
//         </Formik>
//     );
// }

// export function CloudEmbeddingProviderModal({
//     selectedProvider,
//     onConfirm,
//     onCancel,
//     existingProvider,
//     setPopup,
// }: {
//     selectedProvider: AIProvider;
//     onConfirm: () => void;
//     onCancel: () => void;
//     existingProvider?: FullCloudEmbeddingProvider;
//     setPopup?: (popup: PopupSpec) => void;
// }) {
//     return (
//         <Modal title={`Configure ${selectedProvider.name}`} onOutsideClick={onCancel}>
//             <div>
//                 <CloudEmbeddingProviderUpdateForm
//                     selectedProvider={selectedProvider}
//                     onClose={onConfirm}
//                     existingProvider={existingProvider}
//                     setPopup={setPopup}
//                 />
//             </div>
//         </Modal>
//     );
// }