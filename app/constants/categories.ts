/** 11 expense categories with label and emoji for bills */
export const EXPENSE_CATEGORIES = [
  { value: 'general', label: 'General', emoji: '📦' },
  { value: 'food', label: 'Food & Dining', emoji: '🍕' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'utilities', label: 'Utilities', emoji: '💡' },
  { value: 'rent', label: 'Rent & Housing', emoji: '🏠' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'health', label: 'Health', emoji: '🏥' },
  { value: 'education', label: 'Education', emoji: '📚' },
  { value: 'other', label: 'Other', emoji: '📌' },
] as const;

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]['value'];
