import type { ProductRow } from 'src/data/default';

/**
 * src/data/yyyymm.json 파일 저장 형식
 *
 * cancelledIds: Set<string>은 JSON 직렬화 불가 → string[]로 저장
 */
export interface SavedOrderData {
  /** 연월 (예: "202603") */
  yyyymm: string;
  /** 저장 시각 (ISO 8601) */
  savedAt: string;
  products: ProductRow[];
  /** 취소/반품 상품 ID 목록 (Set → Array 직렬화) */
  cancelledIds: string[];
  /** 체크된 상품 ID 목록 (Set → Array 직렬화) */
  checkedIds: string[];
}
