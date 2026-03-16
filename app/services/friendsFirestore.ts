import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import type { Friend, FriendBill, FriendBillSplit } from '../types/firestore';

const USERS = 'users';
const FRIENDS = 'friends';
const BILLS = 'bills';

function toFriendBill(data: Record<string, unknown>, id: string): FriendBill {
  const t = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  const splitsRaw = (data.splits as Array<{ memberId: string; amount: number; paid: boolean }>) || [];
  return {
    id,
    description: (data.description as string) || '',
    totalAmount: Number(data.totalAmount) || 0,
    paidBy: (data.paidBy as string) || 'me',
    splits: splitsRaw.map((s) => ({ memberId: s.memberId, amount: Number(s.amount) || 0, paid: !!s.paid })),
    createdAt: { seconds: t.seconds, nanoseconds: t.nanoseconds },
    category: typeof data.category === 'string' ? data.category : undefined,
  };
}

function friendBillsRef(uid: string, friendId: string) {
  return collection(db, USERS, uid, FRIENDS, friendId, BILLS);
}

function friendRef(uid: string, friendId: string) {
  return doc(db, USERS, uid, FRIENDS, friendId);
}

export async function getFriends(uid: string): Promise<Friend[]> {
  const ref = collection(db, USERS, uid, FRIENDS);
  const snap = await getDocs(ref);
  const result: Friend[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const billsSnap = await getDocs(collection(db, USERS, uid, FRIENDS, d.id, BILLS));
    const bills: FriendBill[] = billsSnap.docs.map((b) => toFriendBill(b.data() as Record<string, unknown>, b.id));
    const createdAt = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
    result.push({
      id: d.id,
      name: (data.name as string) || '',
      phone: (data.phone as string) || undefined,
      email: (data.email as string) || undefined,
      bills,
      createdAt: { seconds: createdAt.seconds, nanoseconds: createdAt.nanoseconds },
    });
  }
  return result;
}

export async function getFriend(uid: string, friendId: string): Promise<Friend | null> {
  const ref = friendRef(uid, friendId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const billsSnap = await getDocs(friendBillsRef(uid, friendId));
  const bills: FriendBill[] = billsSnap.docs.map((b) => toFriendBill(b.data() as Record<string, unknown>, b.id));
  const createdAt = (data.createdAt as Timestamp) || { seconds: 0, nanoseconds: 0 };
  return {
    id: snap.id,
    name: (data.name as string) || '',
    phone: (data.phone as string) || undefined,
    email: (data.email as string) || undefined,
    bills,
    createdAt: { seconds: createdAt.seconds, nanoseconds: createdAt.nanoseconds },
  };
}

export async function addFriend(uid: string, name: string, phone?: string, email?: string): Promise<string> {
  const ref = doc(collection(db, USERS, uid, FRIENDS));
  await setDoc(ref, {
    name: name.trim(),
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addFriendBill(
  uid: string,
  friendId: string,
  description: string,
  totalAmount: number,
  paidByMe: boolean,
  category?: string
): Promise<string> {
  const ref = friendBillsRef(uid, friendId);
  const half = Math.round((totalAmount / 2) * 100) / 100;
  const splits: FriendBillSplit[] = [
    { memberId: 'me', amount: half, paid: paidByMe },
    { memberId: friendId, amount: half, paid: !paidByMe },
  ];
  const docRef = await addDoc(ref, {
    description: description.trim(),
    totalAmount,
    paidBy: paidByMe ? 'me' : friendId,
    splits,
    createdAt: serverTimestamp(),
    category: category || 'general',
  });
  return docRef.id;
}

export async function toggleFriendBillPaid(
  uid: string,
  friendId: string,
  billId: string,
  memberId: string
): Promise<void> {
  const ref = doc(db, USERS, uid, FRIENDS, friendId, BILLS, billId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Record<string, unknown>;
  const splits = (data.splits as FriendBillSplit[]) || [];
  const next = splits.map((s) =>
    s.memberId === memberId ? { ...s, paid: !s.paid } : s
  );
  await updateDoc(ref, { splits: next });
}

export async function deleteFriendBill(
  uid: string,
  friendId: string,
  billId: string
): Promise<void> {
  const ref = doc(db, USERS, uid, FRIENDS, friendId, BILLS, billId);
  await deleteDoc(ref);
}

/** Mark all unpaid splits for this friend as paid (settle up) */
export async function settleUpFriend(uid: string, friendId: string): Promise<void> {
  const friend = await getFriend(uid, friendId);
  if (!friend) return;
  for (const bill of friend.bills) {
    for (const split of bill.splits) {
      if (!split.paid) {
        await toggleFriendBillPaid(uid, friendId, bill.id, split.memberId);
      }
    }
  }
}

export async function updateFriend(
  uid: string,
  friendId: string,
  data: { name?: string; phone?: string; email?: string }
): Promise<void> {
  const ref = friendRef(uid, friendId);
  await updateDoc(ref, {
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
    ...(data.email !== undefined && { email: data.email?.trim() || null }),
  });
}

export async function deleteFriend(uid: string, friendId: string): Promise<void> {
  const billsRef = friendBillsRef(uid, friendId);
  const billsSnap = await getDocs(billsRef);
  for (const b of billsSnap.docs) {
    await deleteDoc(doc(db, USERS, uid, FRIENDS, friendId, BILLS, b.id));
  }
  await deleteDoc(friendRef(uid, friendId));
}

export function getFriendBalance(friend: Friend): { theyOweMe: number; iOweThem: number } {
  let theyOweMe = 0;
  let iOweThem = 0;
  friend.bills.forEach((bill) => {
    if (bill.paidBy === 'me') {
      const s = bill.splits.find((x) => x.memberId === friend.id);
      if (s && !s.paid) theyOweMe += s.amount;
    } else {
      const s = bill.splits.find((x) => x.memberId === 'me');
      if (s && !s.paid) iOweThem += s.amount;
    }
  });
  return { theyOweMe, iOweThem };
}
