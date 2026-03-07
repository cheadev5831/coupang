import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProductRow } from 'src/data/default';

interface FirestoreOrderData {
  yyyymm: string;
  savedAt: string;
  products: ProductRow[];
  cancelledIds: string[];
  checkedIds: string[];
}

export async function loadOrdersFromFirestore(
  yyyymm: string,
): Promise<{ products: ProductRow[]; cancelledIds: Set<string>; checkedIds: Set<string> } | null> {
  const snap = await getDoc(doc(db, 'orders', yyyymm));
  if (!snap.exists()) return null;

  const data = snap.data() as FirestoreOrderData;
  return {
    products: data.products,
    cancelledIds: new Set(data.cancelledIds),
    checkedIds: new Set(data.checkedIds ?? []),
  };
}

export async function saveOrdersToFirestore(
  yyyymm: string,
  products: ProductRow[],
  cancelledIds: Set<string>,
  checkedIds: Set<string>,
): Promise<void> {
  const data: FirestoreOrderData = {
    yyyymm,
    savedAt: new Date().toISOString(),
    products,
    cancelledIds: Array.from(cancelledIds),
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
