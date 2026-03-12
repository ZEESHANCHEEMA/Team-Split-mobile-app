export interface UserProfile {
  displayName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
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
}

export interface MemberBalanceSummary {
  id: string;
  name: string;
  net: number;
}
