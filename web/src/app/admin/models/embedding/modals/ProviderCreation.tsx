import React, { useState } from 'react';
import { Text, Button, Callout } from "@tremor/react";
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Label } from "@/components/admin/connectors/Field";
import { LoadingAnimation } from "@/components/Loading";
import { CloudEmbeddingProvider } from '../components/types';
import { EMBEDDING_PROVIDERS_ADMIN_URL } from '../../llm/constants';
import { Modal } from '@/components/Modal';

export function ProviderCreation({
    selectedProvider,
    onConfirm,
    existingProvider,
}: {
    selectedProvider: CloudEmbeddingProvider;
    onConfirm: () => void;
    existingProvider?: CloudEmbeddingProvider;
}) {

    const [isTesting, setIsTesting] = useState(false);
    const [testError, setTestError] = useState<string>("");

    const initialValues = {
        name: existingProvider?.name || selectedProvider.name,
        api_key: existingProvider?.api_key || "",
        custom_config: existingProvider?.custom_config
            ? Object.entries(existingProvider.custom_config)
            : [],
        default_model_name: "",
        model_id: 0
    };

    const validationSchema = Yup.object({
        name: Yup.string().required("Name is required"),
        api_key: Yup.string().required("API Key is required"),
        custom_config: Yup.array().of(
            Yup.array().of(Yup.string()).length(2)
        ),
    });

    const handleSubmit = async (values: any, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
        console.log("handleSubmit called with values:", values);
        setIsTesting(true);
        setTestError("");

        try {
            const customConfig = Object.fromEntries(values.custom_config);
            const body = JSON.stringify({
                api_key: values.api_key,
                provider: values.name.toLowerCase().split(" ")[0],
                default_model_id: values.name
            })

            const initialResponse = await fetch("/api/admin/llm/test-embedding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: body
            });

            if (!initialResponse.ok) {
                const errorMsg = (await initialResponse.json()).detail;
                setTestError(errorMsg);
                setIsTesting(false);
                setSubmitting(false);
                return;
            }

            const response = await fetch(EMBEDDING_PROVIDERS_ADMIN_URL, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    custom_config: customConfig,
                    is_default_provider: false,
                    is_configured: true,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update provider");
            }

            onConfirm();
        } catch (error: unknown) {
            if (error instanceof Error) {
                setTestError(error.message);
            } else {
                setTestError("An unknown error occurred");
            }
        } finally {
            setIsTesting(false);
            setSubmitting(false);
        }
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
        >
            {({ values, errors, touched, isSubmitting, handleSubmit }) => (
                <Form onSubmit={handleSubmit} className="space-y-4">
                    <Text className="text-lg mb-2">
                        You are setting the credentials for this provider. To access this information, follow the instructions <a className="cursor-pointer underline" target="_blank" href={selectedProvider.apiLink}>here</a> and gather your &quot;API KEY&quot;.
                    </Text>

                    <p>
                        Please note that using this will cost around $4000! Learn more about costs at <a className="cursor-pointer underline">this page</a>.
                    </p>

                    <Callout title="IMPORTANT" color="blue" className="mt-4">
                        <div className="flex flex-col gap-y-2">
                            You will need to retrieve your API credentials for this update.
                            <Label>API Key</Label>
                            <Field name="api_key" type="password" className="text-lg w-full p-1" />
                            {errors.api_key && touched.api_key && <div className="text-red-500">{errors.api_key}</div>}
                            <a href={selectedProvider.apiLink} target="_blank" className="underline cursor-pointer">
                                Learn more here
                            </a>
                        </div>
                    </Callout>

                    {testError && (
                        <Callout title="Error" color="red">
                            {testError}
                        </Callout>
                    )}

                    <Button type="submit" color="blue" className="w-full" disabled={isSubmitting}>
                        {isTesting ? <LoadingAnimation /> : (existingProvider ? "Update" : "Create")}
                    </Button>
                </Form>
            )}
        </Formik>
    );
}



export function ProviderCreationModal2({
    selectedProvider,
    onConfirm,
    onCancel,
    existingProvider,
}: {
    selectedProvider: CloudEmbeddingProvider;
    onConfirm: () => void;
    onCancel: () => void;
    existingProvider?: CloudEmbeddingProvider;
}) {
    return (
        <Modal title={`Configure ${selectedProvider.name}`} onOutsideClick={onCancel} icon={selectedProvider.icon}>
            <div>
                <ProviderCreation
                    selectedProvider={selectedProvider}
                    onConfirm={onConfirm}
                    existingProvider={existingProvider}
                />
            </div>
        </Modal>
    );
}