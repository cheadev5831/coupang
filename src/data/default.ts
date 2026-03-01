/**
 * 쿠팡 주문 분석기 - 데이터 구조 정의
 *
 * 변경 이력:
 * - 2026-03-01 v1.0.0: 초기 정의
 * - 2026-03-01 v1.1.0: 체크 단위를 주문→상품으로 변경, OrderGroup 추가
 * - 2026-03-01 v1.2.0: 주문 그룹화 제거 → 플랫 리스트, OrderGroup 삭제
 *   - 변경 이유: 그룹 헤더 없이 상품 행만 플랫하게 표시하는 것으로 결정
 *   - 영향 범위: OrderGroup 인터페이스 삭제, ProductList 컴포넌트는 ProductRow[] 직접 사용
 *
 * 주의: 이 파일 수정 시 ProductList.vue, SummaryBar.vue, orderStore.ts 에 영향
 */

// ─────────────────────────────────────────────
// 쿠키 설정
// ─────────────────────────────────────────────

export const COOKIE_STORAGE_KEY = 'coupang_cookie' as const;

export interface CookieState {
  value: string | null;
  isSet: boolean;
  savedAt: string | null;
}

export const defaultCookieState: CookieState = {
  value: null,
  isSet: false,
  savedAt: null,
};

// ─────────────────────────────────────────────
// 날짜/월 선택
// ─────────────────────────────────────────────

export interface SelectedMonth {
  year: number;
  month: number; // 1~12
}

export const defaultSelectedMonth: SelectedMonth = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
};

// ─────────────────────────────────────────────
// 주문 데이터 (스프레드시트 컬럼 기준)
// ─────────────────────────────────────────────

/**
 * 스프레드시트 컬럼 매핑:
 *   Order ID   → orderId
 *   Order Date → orderedAt
 *   Product Name → name
 *   Price      → price
 *   Image      → imageUrl
 *   Checked    → checked (UI 상태, API 응답에는 없음)
 */

/**
 * 상품 행 — 체크박스의 실제 단위
 *
 * 한 주문(orderId)에 N개의 ProductRow가 존재한다.
 * 예: orderId=28100173563918 → 4개의 ProductRow
 */
export interface ProductRow {
  /**
   * 고유 식별자: orderId + "_" + rowIndex 조합
   * 쿠팡 API에 상품 단위 고유 ID가 없는 경우를 대비한 임시 키
   * 실제 API 응답에 productId가 있으면 그것으로 교체할 것
   */
  id: string;
  /** 속한 주문 번호 */
  orderId: string;
  /** 주문 일자 (YYYY.MM.DD) */
  orderedAt: string;
  /** 상품명 */
  name: string;
  /** 결제 금액 (원) */
  price: number;
  /** 상품 이미지 URL (없으면 null) */
  imageUrl: string | null;
}

// ─────────────────────────────────────────────
// 월별 캐시
// ─────────────────────────────────────────────

/**
 * 캐시 키 형식: "YYYY-MM" (예: "2026-02")
 */
export type MonthCacheKey = string;

export interface MonthCache {
  key: MonthCacheKey;
  /** 상품 행 단위 전체 목록 (정렬: orderedAt 내림차순) */
  products: ProductRow[];
  /** 취소/반품 상품 ID 집합 (ProductRow.id) */
  cancelledIds: Set<string>;
  cachedAt: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage: string | null;
}

export const defaultMonthCache: MonthCache = {
  key: '',
  products: [],
  cancelledIds: new Set(),
  cachedAt: '',
  status: 'idle',
  errorMessage: null,
};

// ─────────────────────────────────────────────
// 금액 집계
// ─────────────────────────────────────────────

/**
 * SummaryBar 컴포넌트 표시 데이터
 *
 * 스프레드시트 Summary 행 대응:
 *   Total   → totalAmount  (예: 668,210)
 *   Checked → checkedAmount (예: 15,460)
 */
export interface OrderSummary {
  /** 해당 월 전체 상품 가격 합산 */
  totalAmount: number;
  /** 체크된 상품 가격 합산 */
  checkedAmount: number;
  /** 전체 상품 수 */
  totalCount: number;
  /** 체크된 상품 수 */
  checkedCount: number;
}

export const defaultOrderSummary: OrderSummary = {
  totalAmount: 0,
  checkedAmount: 0,
  totalCount: 0,
  checkedCount: 0,
};

// ─────────────────────────────────────────────
// 체크 상태
// ─────────────────────────────────────────────

/**
 * 월별 체크된 상품 ID 집합
 *
 * key: MonthCacheKey ("YYYY-MM")
 * value: 체크된 ProductRow.id 의 Set
 *
 * 월별로 독립 관리 → 탭 전환 후 복귀 시 상태 유지
 */
export type CheckedItemsMap = Map<MonthCacheKey, Set<string>>;

// ─────────────────────────────────────────────
// API 설정
// ─────────────────────────────────────────────

export const API_CONFIG = {
  BASE_URL: '/api',
  /** mc.coupang.com 주문 목록 엔드포인트 (precode.js 기준) */
  ORDERS_ENDPOINT: '/ssr/api/myorders/model/page',
  PAGE_SIZE: 10,
} as const;
