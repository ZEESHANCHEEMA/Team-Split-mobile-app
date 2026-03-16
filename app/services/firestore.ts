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
  ActivityExpense,
  RecurringExpense,
  Reminder,
} from '../types/firestore';

const USERS = 'users';
const TEAMS = 'teams';
const EXPENSES = 'expenses';
const RECURRING = 'recurring';
const REMINDERS = 'reminders';
const CURRENCY = 'Rs';

function toUserProfile(data: Record<string, unknown>, id: string): UserProfile {
  const t = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  return {
    displayName: (data.displayName as string) || '',
    email: (data.email as string) || '',
    phone: (data.phone as string) || '',
    photoUrl: (data.photoUrl as string) || '',
    country: (data.country as string) || undefined,
    currency: (data.currency as string) || undefined,
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
    icon: typeof data.icon === 'string' ? data.icon : undefined,
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
    category: typeof data.category === 'string' ? data.category : undefined,
  };
}

export async function ensureUserProfile(
  uid: string,
  displayName: string,
  email: string,
  phone?: string,
  photoUrl?: string,
  country?: string,
  currency?: string
): Promise<void> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // Merge only fields we have so we don't overwrite saved phone/country/currency on login
    const payload: Record<string, unknown> = {
      displayName,
      email,
      updatedAt: serverTimestamp(),
    };
    if (phone !== undefined) payload.phone = phone || null;
    if (photoUrl !== undefined) payload.photoUrl = photoUrl || null;
    if (country !== undefined) payload.country = country || null;
    if (currency !== undefined) payload.currency = currency || null;
    await setDoc(ref, payload, { merge: true });
  } else {
    const payload: Record<string, unknown> = {
      displayName,
      email,
      phone: phone ?? null,
      photoUrl: photoUrl ?? null,
      country: country ?? null,
      currency: currency ?? null,
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
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
  photoUrl?: string,
  country?: string,
  currency?: string
): Promise<void> {
  await ensureUserProfile(uid, displayName, email, phone, photoUrl, country, currency);
}

export async function createTeam(
  name: string,
  memberIds: string[],
  icon?: string
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const ref = await addDoc(collection(db, TEAMS), {
    name: name.trim(),
    createdBy: uid,
    memberIds: memberIds.length ? memberIds : [uid],
    totalAmount: 0,
    icon: icon || null,
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
    const memberCount =
      (team.memberIds?.length || 0) + (team.guestMembers?.length || 0);
    result.push({
      id: team.id,
      name: team.name,
      youOwe,
      owedToYou,
      memberCount,
      icon: team.icon,
    });
  }
  return result;
}

export async function addExpense(
  teamId: string,
  title: string,
  amount: number,
  paidBy: string,
  splitBetween: string[],
  currency?: string,
  category?: string
): Promise<string> {
  const numericAmount = Number(amount) || 0;
  const ref = await addDoc(collection(db, TEAMS, teamId, EXPENSES), {
    title: title.trim(),
    amount: numericAmount,
    currency: currency ?? CURRENCY,
    paidBy,
    splitBetween: splitBetween.length ? splitBetween : [paidBy],
    createdAt: serverTimestamp(),
    category: category || 'general',
  });
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
  splitBetween: string[],
  category?: string
): Promise<void> {
  const ref = doc(db, TEAMS, teamId, EXPENSES, expenseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Expense not found');
  }
  const existing = snap.data() as Record<string, unknown>;
  const prevAmount = Number(existing.amount) || 0;
  const numericAmount = Number(amount) || 0;
  const payload: Record<string, unknown> = {
    title: title.trim(),
    amount: numericAmount,
    paidBy,
    splitBetween: splitBetween.length ? splitBetween : (existing.splitBetween as string[]),
  };
  if (category !== undefined) payload.category = category || 'general';
  await updateDoc(ref, payload);
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

/** Update team name. Only the team creator can update. */
export async function updateTeamName(teamId: string, name: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');
  if (team.createdBy !== uid) {
    throw new Error('Only the group creator can edit the group name');
  }
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Team name cannot be empty');
  const ref = doc(db, TEAMS, teamId);
  await updateDoc(ref, { name: trimmed });
}

/** Delete a team and all its expenses. Only the team creator can delete. */
export async function deleteTeam(teamId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');
  if (team.createdBy !== uid) {
    throw new Error('Only the group creator can delete the group');
  }
  const expenses = await getExpensesForTeam(teamId);
  const expensesRef = collection(db, TEAMS, teamId, EXPENSES);
  for (const e of expenses) {
    await deleteDoc(doc(expensesRef, e.id));
  }
  await deleteDoc(doc(db, TEAMS, teamId));
}

/**
 * Remove a member from a team (or leave the team if memberId is current user).
 * - Only the creator can remove other members.
 * - Any member can remove themselves (leave).
 */
export async function removeMemberFromTeam(teamId: string, memberId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');
  const isLeaving = memberId === uid;
  if (!isLeaving && team.createdBy !== uid) {
    throw new Error('Only the group creator can remove members');
  }
  const ref = doc(db, TEAMS, teamId);
  const updates: Record<string, unknown> = {};
  const isGuest = team.guestMembers?.some((g) => g.id === memberId);
  if (isGuest) {
    const guestMembers = (team.guestMembers || []).filter((g) => g.id !== memberId);
    updates.guestMembers = guestMembers;
  } else {
    const memberIds = (team.memberIds || []).filter((id) => id !== memberId);
    const noGuests = (team.guestMembers?.length ?? 0) === 0;
    if (memberIds.length === 0 && noGuests && team.createdBy === uid) {
      await deleteTeam(teamId);
      return;
    }
    updates.memberIds = memberIds;
  }
  await updateDoc(ref, updates);
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
  const nameCache = new Map<string, string>();
  const result: MemberBalanceSummary[] = [];

  for (const team of teams) {
    const expenses = await getExpensesForTeam(team.id);
    const memberIds = team.memberIds || [];
    const guestMembers = team.guestMembers || [];
    const teamBalances = new Map<string, number>();

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

      if (e.paidBy === uid) {
        for (const participantId of e.splitBetween) {
          if (participantId === uid) continue;
          teamBalances.set(
            participantId,
            (teamBalances.get(participantId) || 0) + share
          );
        }
      }

      if (e.paidBy !== uid && e.splitBetween.includes(uid) && allIds.has(e.paidBy)) {
        const payerId = e.paidBy;
        teamBalances.set(payerId, (teamBalances.get(payerId) || 0) - share);
      }
    }

    for (const memberId of teamBalances.keys()) {
      if (memberId === uid) continue;
      if (!nameCache.has(memberId)) {
        try {
          const profile = await getUserProfile(memberId);
          if (profile) {
            nameCache.set(memberId, profile.displayName || profile.email || 'Friend');
          }
        } catch {
          // ignore
        }
      }
      const net = teamBalances.get(memberId) ?? 0;
      if (net === 0) continue;
      result.push({
        id: memberId,
        name: nameCache.get(memberId) ?? 'Friend',
        net,
        teamId: team.id,
        teamName: team.name,
      });
    }
  }

  result.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return result;
}

export interface DashboardExtended {
  teams: TeamSummary[];
  memberBalances: MemberBalanceSummary[];
  monthlySpending: number;
  categoryTotals: Record<string, number>;
}

export async function getDashboardExtended(uid: string): Promise<DashboardExtended> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000;
  const teams = await getTeamsForUser(uid);
  const nameCache = new Map<string, string>();
  const teamSummaries: TeamSummary[] = [];
  const allMemberBalances: MemberBalanceSummary[] = [];
  let monthlySpending = 0;
  const categoryTotals: Record<string, number> = {};

  for (const team of teams) {
    const expenses = await getExpensesForTeam(team.id);
    const balance = computeBalanceForUserInTeam(expenses, uid);
    const youOwe = balance < 0 ? Math.abs(balance) : 0;
    const owedToYou = balance > 0 ? balance : 0;
    const memberCount = (team.memberIds?.length || 0) + (team.guestMembers?.length || 0);
    teamSummaries.push({
      id: team.id,
      name: team.name,
      youOwe,
      owedToYou,
      memberCount,
      icon: team.icon,
    });

    const memberIds = team.memberIds || [];
    const guestMembers = team.guestMembers || [];
    const teamBalances = new Map<string, number>();
    for (const g of guestMembers) {
      if (!nameCache.has(g.id)) nameCache.set(g.id, g.name);
    }
    const allIds = new Set<string>([...memberIds, ...guestMembers.map((g) => g.id)]);

    for (const e of expenses) {
      const sec = e.createdAt?.seconds ?? 0;
      if (sec >= currentMonthStart && sec <= currentMonthEnd) {
        monthlySpending += e.amount;
        const cat = e.category || 'general';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
      }
      const share = e.splitBetween.length ? e.amount / e.splitBetween.length : 0;
      if (e.paidBy === uid) {
        for (const participantId of e.splitBetween) {
          if (participantId === uid) continue;
          teamBalances.set(participantId, (teamBalances.get(participantId) || 0) + share);
        }
      }
      if (e.paidBy !== uid && e.splitBetween.includes(uid) && allIds.has(e.paidBy)) {
        teamBalances.set(e.paidBy, (teamBalances.get(e.paidBy) || 0) - share);
      }
    }

    for (const memberId of teamBalances.keys()) {
      if (memberId === uid) continue;
      if (!nameCache.has(memberId)) {
        try {
          const profile = await getUserProfile(memberId);
          if (profile) nameCache.set(memberId, profile.displayName || profile.email || 'Friend');
        } catch {
          // ignore
        }
      }
      const net = teamBalances.get(memberId) ?? 0;
      if (net === 0) continue;
      allMemberBalances.push({
        id: memberId,
        name: nameCache.get(memberId) ?? 'Friend',
        net,
        teamId: team.id,
        teamName: team.name,
      });
    }
  }

  allMemberBalances.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return {
    teams: teamSummaries,
    memberBalances: allMemberBalances,
    monthlySpending,
    categoryTotals,
  };
}

/** Per-member balance within one team (reference: getMemberBalance). For current user's view. */
export async function getMemberBalancesForTeam(
  teamId: string,
  currentUserId: string
): Promise<MemberBalanceSummary[]> {
  const team = await getTeam(teamId);
  if (!team) return [];
  const expenses = await getExpensesForTeam(teamId);
  const memberIds = team.memberIds || [];
  const guestMembers = team.guestMembers || [];
  const allMemberIds = [...new Set([...memberIds, ...guestMembers.map((g) => g.id)])];
  const balances = new Map<string, number>();

  for (const mid of allMemberIds) {
    balances.set(mid, 0);
  }

  for (const e of expenses) {
    const share = e.splitBetween.length ? e.amount / e.splitBetween.length : 0;
    if (e.paidBy === currentUserId) {
      for (const pid of e.splitBetween) {
        if (pid === currentUserId) continue;
        balances.set(pid, (balances.get(pid) ?? 0) + share);
      }
    } else if (e.splitBetween.includes(currentUserId) && allMemberIds.includes(e.paidBy)) {
      balances.set(e.paidBy, (balances.get(e.paidBy) ?? 0) - share);
    }
  }

  const nameCache = new Map<string, string>();
  for (const g of guestMembers) {
    nameCache.set(g.id, g.name);
  }
  for (const id of allMemberIds) {
    if (nameCache.has(id)) continue;
    if (id === currentUserId) {
      nameCache.set(id, 'You');
      continue;
    }
    try {
      const profile = await getUserProfile(id);
      nameCache.set(id, profile?.displayName || profile?.email || 'Friend');
    } catch {
      nameCache.set(id, 'Friend');
    }
  }

  const result: MemberBalanceSummary[] = [];
  for (const id of allMemberIds) {
    const net = balances.get(id) ?? 0;
    if (id === currentUserId) continue;
    result.push({
      id,
      name: nameCache.get(id) ?? 'Friend',
      net,
    });
  }
  return result;
}

/** Resolve paidBy uid to display name from team members or user profile. */
async function resolvePaidByName(
  team: Team,
  paidByUid: string
): Promise<string> {
  const guest = team.guestMembers?.find((g) => g.id === paidByUid);
  if (guest) return guest.name;
  try {
    const profile = await getUserProfile(paidByUid);
    if (profile?.displayName) return profile.displayName;
    if (profile?.email) return profile.email;
  } catch {
    // ignore
  }
  return 'Someone';
}

/** All expenses across user's teams, sorted by date (newest first) for Activity screen. */
export async function getRecentActivity(uid: string, limit = 50): Promise<ActivityExpense[]> {
  const teams = await getTeamsForUser(uid);
  const items: ActivityExpense[] = [];
  for (const team of teams) {
    const expenses = await getExpensesForTeam(team.id);
    for (const e of expenses) {
      const paidByName = await resolvePaidByName(team, e.paidBy);
      items.push({ ...e, teamId: team.id, teamName: team.name, paidByName });
    }
  }
  items.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  return items.slice(0, limit);
}

// ---------- Recurring expenses ----------
function toRecurringExpense(data: Record<string, unknown>, id: string, teamId: string): RecurringExpense {
  const t = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  const last = data.lastCreatedAt as Timestamp | undefined;
  return {
    id,
    teamId,
    title: (data.title as string) || '',
    amount: Number(data.amount) || 0,
    currency: (data.currency as string) || CURRENCY,
    paidBy: (data.paidBy as string) || '',
    splitBetween: (data.splitBetween as string[]) || [],
    frequency: (data.frequency as 'weekly' | 'monthly') || 'monthly',
    interval: Number(data.interval) || 1,
    createdAt: { seconds: t.seconds, nanoseconds: t.nanoseconds },
    lastCreatedAt: last ? { seconds: last.seconds, nanoseconds: last.nanoseconds } : undefined,
  };
}

export async function getRecurringForTeam(teamId: string): Promise<RecurringExpense[]> {
  const q = query(
    collection(db, TEAMS, teamId, RECURRING),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRecurringExpense(d.data() as Record<string, unknown>, d.id, teamId));
}

export async function addRecurringExpense(
  teamId: string,
  title: string,
  amount: number,
  paidBy: string,
  splitBetween: string[],
  frequency: 'weekly' | 'monthly',
  interval: number,
  currency?: string
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const ref = await addDoc(collection(db, TEAMS, teamId, RECURRING), {
    title: title.trim(),
    amount: Number(amount) || 0,
    currency: currency ?? CURRENCY,
    paidBy,
    splitBetween: splitBetween.length ? splitBetween : [paidBy],
    frequency: frequency || 'monthly',
    interval: Math.max(1, Number(interval) || 1),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createExpenseFromRecurring(teamId: string, recurringId: string): Promise<string> {
  const recRef = doc(db, TEAMS, teamId, RECURRING, recurringId);
  const recSnap = await getDoc(recRef);
  if (!recSnap.exists()) throw new Error('Recurring expense not found');
  const data = recSnap.data() as Record<string, unknown>;
  const title = (data.title as string) || '';
  const amount = Number(data.amount) || 0;
  const paidBy = (data.paidBy as string) || '';
  const splitBetween = (data.splitBetween as string[]) || [];
  const currency = (data.currency as string) || CURRENCY;
  const expenseId = await addExpense(teamId, title, amount, paidBy, splitBetween, currency);
  await updateDoc(recRef, { lastCreatedAt: serverTimestamp() });
  return expenseId;
}

export async function deleteRecurringExpense(teamId: string, recurringId: string): Promise<void> {
  const ref = doc(db, TEAMS, teamId, RECURRING, recurringId);
  await deleteDoc(ref);
}

// ---------- Reminders ----------
function toReminder(data: Record<string, unknown>, id: string): Reminder {
  const t = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  const remindAt = data.remindAt as Timestamp | undefined;
  return {
    id,
    targetType: (data.targetType as 'friend' | 'member') || 'friend',
    targetId: (data.targetId as string) || '',
    targetName: (data.targetName as string) || '',
    amount: Number(data.amount) || 0,
    description: (data.description as string) || undefined,
    expenseId: (data.expenseId as string) || undefined,
    teamId: (data.teamId as string) || undefined,
    friendId: (data.friendId as string) || undefined,
    status: (data.status as 'pending' | 'dismissed') || 'pending',
    createdAt: { seconds: t.seconds, nanoseconds: t.nanoseconds },
    remindAt: remindAt ? { seconds: remindAt.seconds, nanoseconds: remindAt.nanoseconds } : undefined,
  };
}

export async function getReminders(uid: string): Promise<Reminder[]> {
  const q = query(
    collection(db, USERS, uid, REMINDERS),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => toReminder(d.data() as Record<string, unknown>, d.id));
  return list.filter((r) => r.status === 'pending');
}

export async function addReminder(
  uid: string,
  params: {
    targetType: 'friend' | 'member';
    targetId: string;
    targetName: string;
    amount: number;
    description?: string;
    expenseId?: string;
    teamId?: string;
    friendId?: string;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, USERS, uid, REMINDERS), {
    ...params,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function dismissReminder(uid: string, reminderId: string): Promise<void> {
  const ref = doc(db, USERS, uid, REMINDERS, reminderId);
  await updateDoc(ref, { status: 'dismissed' });
}

export { CURRENCY };
