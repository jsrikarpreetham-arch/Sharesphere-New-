
import { useMemo } from 'react';
import type { Category, Donation } from './types';

// Use the actual categories returned by the backend.
// Keep all categories, including those without donations.
export function deriveCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) =>
    a.category_name.localeCompare(b.category_name)
  );
}

// Calculate donation counts using the actual donation records.
export function getDonationCounts(donations: Donation[]) {
  const counts = new Map<number, number>();

  donations.forEach((donation) => {
    counts.set(
      donation.category_id,
      (counts.get(donation.category_id) || 0) + 1
    );
  });

  return counts;
}

export const useCategories = (categories: Category[] | null) =>
  useMemo(
    () => deriveCategories(categories || []),
    [categories]
  );
