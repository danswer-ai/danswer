'use client';

import dynamic from 'next/dynamic';
import { StockSkeleton } from './stock-skeleton';
import { StocksSkeleton } from './stocks-skeleton';
import { EventsSkeleton } from './events-skeleton';

export { spinner } from './spinner';
export { BotCard, BotMessage, SystemMessage } from './message';

const Stock = dynamic(() => import('./stock').then(mod => mod.Stock), {
  ssr: false,
  loading: () => <StockSkeleton />,
});

const Purchase = dynamic(
  () => import('./stock-purchase').then(mod => mod.Purchase),
  {
    ssr: false,
    loading: () => (
      <div className="bg-zinc-900 rounded-lg px-4 py-5 text-center text-xs">
        Loading stock info...
      </div>
    ),
  },
);

const Stocks = dynamic(() => import('./stocks').then(mod => mod.Stocks), {
  ssr: false,
  loading: () => <StocksSkeleton />,
});

const Events = dynamic(() => import('./event').then(mod => mod.Events), {
  ssr: false,
  loading: () => <EventsSkeleton />,
});

export { Stock, Purchase, Stocks, Events };
