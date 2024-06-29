import React, { useState } from 'react';
import { Modal } from "@/components/Modal";
import { Button, Text, Callout } from "@tremor/react";

import { Label } from "@/components/admin/connectors/Field";
import { CloudEmbeddingModel, CloudEmbeddingProvider, FullEmbeddingModelDescriptor } from './embeddingModels';

// 1. Model Provider Not Configured
export function ModelNotConfiguredModal({
  modelProvider,
  onConfirm,
  onCancel,
}: {
  modelProvider: CloudEmbeddingProvider;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={`${modelProvider.name} Configuration Required`} onOutsideClick={onCancel}>
      <div className="mb-4">
        <Text className="text-lg mb-2">
          Heads up: {modelProvider.name} isn&apos;t configured yet. Want to unleash its potential now?
        </Text>
        <Text className="text-sm mb-2">
          Pro tip: Setting this up now could save you 30% on compute costs. Your future self will thank you.
        </Text>
        <div className="flex mt-8 justify-between">
          <Button color="gray" onClick={onCancel}>Maybe Later</Button>
          <Button color="blue" onClick={onConfirm}>Let&apos;s Do This</Button>
        </div>
      </div>
    </Modal>
  );
}

// 2. Select Model
export function SelectModelModal({
  model,
  onConfirm,
  onCancel,
}: {
  model: CloudEmbeddingModel;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={`Elevate Your Game with ${model.model_name}`} onOutsideClick={onCancel}>
      <div className="mb-4">
        <Text className="text-lg mb-2">
          You&apos;re about to supercharge your setup with {model.model_name} from
          {/* {model.provider_id}. */}
          Ready to push the envelope?
        </Text>
        <Callout title="Model Specs" color="blue" className="mt-4">
          <div className="flex flex-col gap-y-2">
            <p>TL;DR: {model.description}</p>
            <p>Dimensions: {model.model_dim} (That&apos;s {model.model_dim > 1000 ? 'beefy' : 'lean'})</p>
            <p>Damage to your wallet: ${model.pricePerMillion}/million tokens (Estimated monthly burn rate: $50-$500)</p>
          </div>
        </Callout>
        <div className="flex mt-8 justify-between">
          <Button color="gray" onClick={onCancel}>Abort Mission</Button>
          <Button color="green" onClick={onConfirm}>Ship It</Button>
        </div>
      </div>
    </Modal>
  );
}

// 3. Change Model
export function ChangeModelModal({
  existingModel,
  newModel,
  onConfirm,
  onCancel,
}: {
  existingModel: FullEmbeddingModelDescriptor;
  newModel: CloudEmbeddingModel;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Model Swap: Upgrade or Sidegrade?" onOutsideClick={onCancel}>
      <div className="mb-4">
        <Text className="text-lg mb-2">
          You&apos;re about to trade in your {existingModel.model_name} for a shiny new {newModel.model_name}. Bold move.
        </Text>
        <Callout title="New Hotness Specs" color="blue" className="mt-4">
          <div className="flex flex-col gap-y-2">
            <p>Elevator pitch: {newModel.description}</p>
            <p>Dimensions: {newModel.model_dim} (That&apos;s a {Math.abs(newModel.model_dim - existingModel.model_dim)} dimension {newModel.model_dim > existingModel.model_dim ? 'upgrade' : 'downgrade'})</p>
            {/* <p>Cost delta: ${(newModel?.pricePerMillion! - existingModel?.pricePerMillion!).toFixed(3)}/million tokens (Could save/cost you ~$100/month)</p> */}
          </div>
        </Callout>
        <div className="flex mt-8 justify-between">
          <Button color="gray" onClick={onCancel}>Stick with Old Reliable</Button>
          <Button color="green" onClick={onConfirm}>Embrace the Future</Button>
        </div>
      </div>
    </Modal>
  );
}

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

export function ChangeCredentialsModal({
  provider,
  onConfirm,
  onCancel,
}: {
  provider: CloudEmbeddingProvider;
  onConfirm: (apiKey: string) => void;
  onCancel: () => void;
}) {
  const [apiKey, setApiKey] = useState('');

  return (
    <Modal title={`Swap Keys for ${provider.name}`} onOutsideClick={onCancel}>
      <div className="mb-4">
        <Text className="text-lg mb-2">
          Ready to play key swap with {provider.name}? Your old key is about to hit the bit bucket.
        </Text>
        <Callout title="Read the Fine Print" color="blue" className="mt-4">
          <div className="flex flex-col gap-y-2">
            <p>This isn&apos;t just a local change. Every model tied to this provider will feel the ripple effect.</p>
            <Label>Your Shiny New API Key</Label>
            <input
              type="password"
              className="text-lg w-full p-1"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your 1337 API key here"
            />
            <a href={provider.apiLink} target="_blank" rel="noopener noreferrer" className="underline cursor-pointer">
              RTFM: {provider.name} API key edition
            </a>
          </div>
        </Callout>
        <Text className="text-sm mt-4">
          Fun fact: This key swap could save you up to 15% on your API calls. Or not. We&apos;re developers, not fortune tellers.
        </Text>
        <div className="flex mt-8 justify-between">
          <Button color="gray" onClick={onCancel}>Abort Key Swap</Button>
          <Button color="blue" onClick={() => onConfirm(apiKey)} disabled={!apiKey}>
            Execute Key Swap
          </Button>
        </div>
      </div>
    </Modal>
  );
}