'use client';

import React, { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import initTranslations from '@/app/i18n';
import { createInstance, Resource, TFunction } from 'i18next';

export default function TranslationsProvider({
  children,
  locale,
  namespaces,
  resources,
}: {
  children: ReactNode;
  locale: string;
  namespaces: string[] | undefined;
  resources: Resource | undefined;
}) {
  const i18n = createInstance();

  initTranslations(locale, namespaces, i18n, resources);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}