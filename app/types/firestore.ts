export interface UserProfile {
  displayName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  country?: string;
  currency?: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export interface GuestMember {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
  totalAmount: number;
  guestMembers?: GuestMember[];
  /** Emoji or icon string used as team avatar (e.g. "🏠", "✈️") */
  icon?: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitBetween: string[];
  createdAt: { seconds: number; nanoseconds: number };
}

export interface TeamSummary {
  id: string;
  name: string;
  youOwe: number;
  owedToYou: number;
  memberCount?: number;
  icon?: string;
}

export interface MemberBalanceSummary {
  id: string;
  name: string;
  net: number;
}

/** Expense with team info for Activity feed (reference: Payer · Team, Settled) */
export interface ActivityExpense extends Expense {
  teamId: string;
  teamName: string;
  /** Display name of who paid (for "Payer · Team" line) */
  paidByName?: string;
}
