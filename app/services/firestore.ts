import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import type {
  UserProfile,
  Team,
  Expense,
  TeamSummary,
  GuestMember,
  MemberBalanceSummary,
} from '../types/firestore';

const USERS = 'users';
const TEAMS = 'teams';
const EXPENSES = 'expenses';
const CURRENCY = 'Rs';

function toUserProfile(data: Record<string, unknown>, id: string): UserProfile {
  const t = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  return {
    displayName: (data.displayName as string) || '',
    email: (data.email as string) || '',
    phone: (data.phone as string) || '',
    photoUrl: (data.photoUrl as string) || '',
    createdAt: { seconds: t.seconds, nanoseconds: t.nanoseconds },
  };
}

function toTeam(data: Record<string, unknown>, id: string): Team {
  const t = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  const guestMembersRaw = (data.guestMembers as GuestMember[]) || [];
  return {
    id,
    name: (data.name as string) || '',
    createdBy: (data.createdBy as string) || '',
    memberIds: (data.memberIds as string[]) || [],
    totalAmount: Number(data.totalAmount) || 0,
    guestMembers: guestMembersRaw.map((g) => ({
      id: g.id,
      name: g.name,
    })),
    createdAt: { seconds: t.seconds, nanoseconds: t.nanoseconds },
  };
}

function toExpense(data: Record<string, unknown>, id: string): Expense {
  const t = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  return {
    id,
    title: (data.title as string) || '',
    amount: Number(data.amount) || 0,
    currency: (data.currency as string) || CURRENCY,
    paidBy: (data.paidBy as string) || '',
    splitBetween: (data.splitBetween as string[]) || [],
    createdAt: { seconds: t.seconds, nanoseconds: t.nanoseconds },
  };
}

export async function ensureUserProfile(
  uid: string,
  displayName: string,
  email: string,
  phone?: string,
  photoUrl?: string
): Promise<void> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(
      ref,
      { displayName, email, phone: phone || null, photoUrl: photoUrl || null, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } else {
    await setDoc(ref, {
      displayName,
      email,
      phone: phone || null,
      photoUrl: photoUrl || null,
      createdAt: serverTimestamp(),
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toUserProfile(snap.data() as Record<string, unknown>, snap.id);
}

export async function updateUserProfile(
  uid: string,
  displayName: string,
  email: string,
  phone?: string,
  photoUrl?: string
): Promise<void> {
  await ensureUserProfile(uid, displayName, email, phone, photoUrl);
}

export async function createTeam(name: string, memberIds: string[]): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const ref = await addDoc(collection(db, TEAMS), {
    name: name.trim(),
    createdBy: uid,
    memberIds: memberIds.length ? memberIds : [uid],
    totalAmount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTeamsForUser(uid: string): Promise<Team[]> {
  const q = query(
    collection(db, TEAMS),
    where('memberIds', 'array-contains', uid)
  );
  const snap = await getDocs(q);
  const teams = snap.docs.map((d) => toTeam(d.data() as Record<string, unknown>, d.id));
  teams.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  return teams;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const ref = doc(db, TEAMS, teamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toTeam(snap.data() as Record<string, unknown>, snap.id);
}

export async function getExpensesForTeam(teamId: string): Promise<Expense[]> {
  const q = query(
    collection(db, TEAMS, teamId, EXPENSES),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toExpense(d.data() as Record<string, unknown>, d.id));
}

export async function getExpense(teamId: string, expenseId: string): Promise<Expense | null> {
  const ref = doc(db, TEAMS, teamId, EXPENSES, expenseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toExpense(snap.data() as Record<string, unknown>, snap.id);
}

export function computeBalanceForUserInTeam(expenses: Expense[], userId: string): number {
  let balance = 0;
  for (const e of expenses) {
    const share = e.splitBetween.length ? e.amount / e.splitBetween.length : 0;
    if (e.paidBy === userId) balance += e.amount;
    if (e.splitBetween.includes(userId)) balance -= share;
  }
  return balance;
}

export async function getDashboardTeams(uid: string): Promise<TeamSummary[]> {
  const teams = await getTeamsForUser(uid);
  const result: TeamSummary[] = [];
  for (const team of teams) {
    const expenses = await getExpensesForTeam(team.id);
    const balance = computeBalanceForUserInTeam(expenses, uid);
    const youOwe = balance < 0 ? Math.abs(balance) : 0;
    const owedToYou = balance > 0 ? balance : 0;
    result.push({ id: team.id, name: team.name, youOwe, owedToYou });
  }
  return result;
}

export async function addExpense(
  teamId: string,
  title: string,
  amount: number,
  paidBy: string,
  splitBetween: string[]
): Promise<string> {
  const numericAmount = Number(amount) || 0;
  const ref = await addDoc(collection(db, TEAMS, teamId, EXPENSES), {
    title: title.trim(),
    amount: numericAmount,
    currency: CURRENCY,
    paidBy,
    splitBetween: splitBetween.length ? splitBetween : [paidBy],
    createdAt: serverTimestamp(),
  });
  // keep aggregated total on the team document
  const teamRef = doc(db, TEAMS, teamId);
  await updateDoc(teamRef, {
    totalAmount: increment(numericAmount),
  });
  return ref.id;
}

export async function updateExpense(
  teamId: string,
  expenseId: string,
  title: string,
  amount: number,
  paidBy: string,
  splitBetween: string[]
): Promise<void> {
  const ref = doc(db, TEAMS, teamId, EXPENSES, expenseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Expense not found');
  }
  const existing = snap.data() as Record<string, unknown>;
  const prevAmount = Number(existing.amount) || 0;
  const numericAmount = Number(amount) || 0;
  await updateDoc(ref, {
    title: title.trim(),
    amount: numericAmount,
    paidBy,
    splitBetween: splitBetween.length ? splitBetween : (existing.splitBetween as string[]),
  });
  const diff = numericAmount - prevAmount;
  if (diff !== 0) {
    const teamRef = doc(db, TEAMS, teamId);
    await updateDoc(teamRef, { totalAmount: increment(diff) });
  }
}

export async function deleteExpense(teamId: string, expenseId: string): Promise<void> {
  const ref = doc(db, TEAMS, teamId, EXPENSES, expenseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return;
  }
  const existing = snap.data() as Record<string, unknown>;
  const prevAmount = Number(existing.amount) || 0;
  await deleteDoc(ref);
  const teamRef = doc(db, TEAMS, teamId);
  await updateDoc(teamRef, { totalAmount: increment(-prevAmount) });
}

export async function addGuestMemberToTeam(teamId: string, name: string): Promise<GuestMember> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Name required');
  }
  const ref = doc(db, TEAMS, teamId);
  const snap = await getDoc(ref);
  const existingData = (snap.data() as Record<string, unknown>) || {};
  const existingGuests = (existingData.guestMembers as GuestMember[]) || [];
  const newGuest: GuestMember = {
    id: `guest_${Date.now()}`,
    name: trimmed,
  };
  const updatedGuests = [...existingGuests, newGuest];
  await updateDoc(ref, { guestMembers: updatedGuests });
  return newGuest;
}

export async function getMemberBalancesForUser(uid: string): Promise<MemberBalanceSummary[]> {
  const teams = await getTeamsForUser(uid);
  const balances = new Map<string, number>();
  const nameCache = new Map<string, string>();

  for (const team of teams) {
    const expenses = await getExpensesForTeam(team.id);
    const memberIds = team.memberIds || [];
    const guestMembers = team.guestMembers || [];

    for (const g of guestMembers) {
      if (!nameCache.has(g.id)) {
        nameCache.set(g.id, g.name);
      }
    }

    const allIds = new Set<string>([
      ...memberIds,
      ...guestMembers.map((g) => g.id),
    ]);

    for (const e of expenses) {
      const share = e.splitBetween.length ? e.amount / e.splitBetween.length : 0;

      // If current user paid, others owe them their share
      if (e.paidBy === uid) {
        for (const participantId of e.splitBetween) {
          if (participantId === uid) continue;
          balances.set(
            participantId,
            (balances.get(participantId) || 0) + share
          );
        }
      }

      // If someone else paid and current user is in the split, user owes that payer their share
      if (e.paidBy !== uid && e.splitBetween.includes(uid) && allIds.has(e.paidBy)) {
        const payerId = e.paidBy;
        balances.set(payerId, (balances.get(payerId) || 0) - share);
      }
    }
  }

  for (const memberId of balances.keys()) {
    if (!nameCache.has(memberId) && memberId !== uid) {
      try {
        const profile = await getUserProfile(memberId);
        if (profile) {
          nameCache.set(memberId, profile.displayName || profile.email || 'Friend');
        }
      } catch {
        // ignore lookup failures
      }
    }
    if (!nameCache.has(memberId)) {
      nameCache.set(memberId, memberId === uid ? 'You' : 'Friend');
    }
  }

  const result: MemberBalanceSummary[] = [];
  for (const [id, net] of balances.entries()) {
    if (id === uid) continue;
    result.push({
      id,
      name: nameCache.get(id) ?? 'Friend',
      net,
    });
  }

  result.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return result;
}

export { CURRENCY };
