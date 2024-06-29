import React from 'react';
import { Modal } from "@/components/Modal";
import { Button, Text, Callout } from "@tremor/react";
import { CloudEmbeddingProvider } from '../components/types';



// 4. Delete Credentials
export function DeleteCredentialsModal({
    modelProvider,
    onConfirm,
    onCancel,
}: {
    modelProvider: CloudEmbeddingProvider;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <Modal title={`Nuke ${modelProvider.name} Credentials?`} onOutsideClick={onCancel}>
            <div className="mb-4">
                <Text className="text-lg mb-2">
                    You&apos;re about to send your {modelProvider.name} credentials to /dev/null. Sure about this?
                </Text>
                <Callout title="Point of No Return" color="red" className="mt-4">
                    <p>This is a one-way ticket. You&apos;ll need to go through the whole song and dance of reconfiguring if you change your mind. Estimated setup time: 10 minutes of your life you&apos;ll never get back.</p>
                </Callout>
                <div className="flex mt-8 justify-between">
                    <Button color="gray" onClick={onCancel}>Keep &apos;em</Button>
                    <Button color="red" onClick={onConfirm}>Nuke &apos;em</Button>
                </div>
            </div>
        </Modal>
    );
}
