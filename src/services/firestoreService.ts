import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProductRow, UserItem } from 'src/models/order';

interface FirestoreOrderData {
  yyyymm: string;
  savedAt: string;
  products: ProductRow[];
  checkedIds: string[];
}

export async function loadOrdersFromFirestore(
  yyyymm: string,
): Promise<{ products: ProductRow[]; checkedIds: Set<string> } | null> {
  const snap = await getDoc(doc(db, 'orders', yyyymm));
  if (!snap.exists()) return null;

  const data = snap.data() as FirestoreOrderData;
  return {
    products: data.products,
    checkedIds: new Set(data.checkedIds ?? []),
  };
}

export async function saveOrdersToFirestore(
  yyyymm: string,
  products: ProductRow[],
  checkedIds: Set<string>,
): Promise<void> {
  const data: FirestoreOrderData = {
    yyyymm,
    savedAt: new Date().toISOString(),
    products,
    checkedIds: Array.from(checkedIds),
  };
  await setDoc(doc(db, 'orders', yyyymm), data);
}

export async function deleteOrdersFromFirestore(yyyymm: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', yyyymm));
}

export async function listDataMonths(): Promise<{ year: number; month: number }[]> {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs
    .filter((d) => /^\d{6}$/.test(d.id))
    .map((d) => ({
      year: parseInt(d.id.slice(0, 4), 10),
      month: parseInt(d.id.slice(4, 6), 10),
    }));
}

export async function loadUserItemsFromFirestore(yyyymm: string): Promise<UserItem[]> {
  const snap = await getDoc(doc(db, 'userItems', yyyymm));
  if (!snap.exists()) return [];
  const data = snap.data() as { items: UserItem[] };
  return data.items ?? [];
}

export async function saveUserItemsToFirestore(yyyymm: string, items: UserItem[]): Promise<void> {
  await setDoc(doc(db, 'userItems', yyyymm), { yyyymm, items });
}

export async function loadMonthSummaries(
  yyyymms: string[],
): Promise<Map<string, { totalAmount: number; checkedAmount: number }>> {
  const snaps = await Promise.all(yyyymms.map((m) => getDoc(doc(db, 'orders', m))));
  const result = new Map<string, { totalAmount: number; checkedAmount: number }>();

  for (let i = 0; i < yyyymms.length; i++) {
    const snap = snaps[i];
    if (snap && snap.exists()) {
      const data = snap.data() as FirestoreOrderData;
      const checkedSet = new Set(data.checkedIds ?? []);
      const totalAmount = data.products.reduce((sum, p) => sum + p.price, 0);
      const checkedAmount = data.products
        .filter((p) => checkedSet.has(p.id))
        .reduce((sum, p) => sum + p.price, 0);
      result.set(yyyymms[i]!, { totalAmount, checkedAmount });
    }
  }

  return result;
}
