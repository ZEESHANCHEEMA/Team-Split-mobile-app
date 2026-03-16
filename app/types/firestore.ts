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
  /** Category key e.g. food, transport */
  category?: string;
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
  /** Team this balance is for (dashboard People summary) */
  teamId?: string;
  teamName?: string;
}

/** Expense with team info for Activity feed (reference: Payer · Team, Settled) */
export interface ActivityExpense extends Expense {
  teamId: string;
  teamName: string;
  /** Display name of who paid (for "Payer · Team" line) */
  paidByName?: string;
}

/** Split for a friend bill (50/50: me + friend) */
export interface FriendBillSplit {
  memberId: string; // 'me' or friendId
  amount: number;
  paid: boolean;
}

/** Bill between you and one friend */
export interface FriendBill {
  id: string;
  description: string;
  totalAmount: number;
  paidBy: string; // 'me' | friendId
  splits: FriendBillSplit[];
  createdAt: { seconds: number; nanoseconds: number };
  category?: string;
}

/** Friend (contact) for 1:1 expense splitting */
export interface Friend {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  bills: FriendBill[];
  createdAt?: { seconds: number; nanoseconds: number };
}

/** Recurring expense template (e.g. rent monthly) – create actual expense from this */
export interface RecurringExpense {
  id: string;
  teamId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitBetween: string[];
  frequency: 'weekly' | 'monthly';
  interval: number;
  createdAt: { seconds: number; nanoseconds: number };
  lastCreatedAt?: { seconds: number; nanoseconds: number };
}

/** Reminder to ask someone to pay */
export interface Reminder {
  id: string;
  targetType: 'friend' | 'member';
  targetId: string;
  targetName: string;
  amount: number;
  description?: string;
  expenseId?: string;
  teamId?: string;
  friendId?: string;
  status: 'pending' | 'dismissed';
  createdAt: { seconds: number; nanoseconds: number };
  remindAt?: { seconds: number; nanoseconds: number };
}
