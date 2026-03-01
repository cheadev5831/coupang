/**
 * 쿠팡 주문 목록 조회 서비스
 *
 * - API: GET /api/ssr/api/myorders/model/page (Vite 프록시 → mc.coupang.com)
 * - 페이지네이션: pageIndex 0부터 증가, 해당 월보다 이전 날짜 항목 발견 시 종료
 * - 취소/반품 상품: 집계 포함하되 cancelledIds Set에 추가 (UI에서 취소선 처리)
 */

import axios from 'axios';
import { API_CONFIG, type ProductRow } from 'src/data/default';
import type { CoupangOrderListResponse, CoupangOrder } from 'src/types/api';

export interface FetchOrdersResult {
  products: ProductRow[];
  cancelledIds: Set<string>;
}

/** orderedAt(ms timestamp) → { orderDate: 'YYYYMMDD', orderedAt: 'YYYY.MM.DD' } */
function parseOrderDate(timestamp: number): { orderDate: string; displayDate: string } {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    orderDate: `${y}${m}${day}`,
    displayDate: `${y}.${m}.${day}`,
  };
}

/** 한 주문의 상품 행들을 ProductRow[] + cancelledIds 로 변환 */
function parseOrderProducts(
  order: CoupangOrder,
  displayDate: string,
): { rows: ProductRow[]; cancelledIds: string[] } {
  const rows: ProductRow[] = [];
  const cancelledIds: string[] = [];
  let productIdx = 0;

  for (const group of order.deliveryGroupList) {
    const status = group.groupStatus?.status ?? '';
    const isCancelled = status.includes('RETURN') || status.includes('CANCEL');

    for (const p of group.productList) {
      const id = `${order.orderId}_${productIdx++}`;
      rows.push({
        id,
        orderId: String(order.orderId),
        orderedAt: displayDate,
        name: p.productName,
        // precode.js 기준: 단가 × 수량 + 기본배송비
        price: p.discountedUnitPrice * p.quantity + order.baseDeliveryPrice,
        imageUrl: p.imagePath || null,
      });

      if (isCancelled) cancelledIds.push(id);
    }
  }

  return { rows, cancelledIds };
}

/**
 * 지정 연월의 주문 목록 전체를 조회하여 반환.
 *
 * @param year   조회 연도
 * @param month  조회 월 (1~12)
 * @param cookie 쿠팡 세션 쿠키 문자열 (개발자 도구 Network 탭 Cookie 헤더 값)
 */
export async function fetchOrders(
  year: number,
  month: number,
  cookie: string,
): Promise<FetchOrdersResult> {
  const yearStr = String(year);
  const monthStr = String(month).padStart(2, '0');
  // 해당 월 1일 YYYYMMDD — 이보다 이전 날짜 발견 시 페이지네이션 종료
  const stopDate = `${yearStr}${monthStr}01`;

  const allProducts: ProductRow[] = [];
  const allCancelledIds = new Set<string>();

  let pageIndex = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await axios.get<CoupangOrderListResponse>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ORDERS_ENDPOINT}`,
      {
        params: {
          requestYear: year,
          pageIndex,
          size: API_CONFIG.PAGE_SIZE,
        },
        headers: {
          // 브라우저 forbidden-header 우회: Vite 프록시에서 Cookie 헤더로 변환
          'X-Coupang-Cookie': cookie,
        },
      },
    );

    const orderList = response.data.orderList ?? [];

    if (orderList.length === 0) {
      hasMore = false;
      break;
    }

    // 해당 월 1일보다 이전 날짜 주문이 있으면 다음 페이지 불필요
    const hasOlderOrder = orderList.some((order) => {
      const { orderDate } = parseOrderDate(order.orderedAt);
      return orderDate < stopDate;
    });
    hasMore = !hasOlderOrder;

    // 해당 연월 상품만 파싱
    for (const order of orderList) {
      const { orderDate, displayDate } = parseOrderDate(order.orderedAt);

      if (!orderDate.startsWith(yearStr + monthStr)) continue;

      const { rows, cancelledIds } = parseOrderProducts(order, displayDate);
      allProducts.push(...rows);
      cancelledIds.forEach((id) => allCancelledIds.add(id));
    }

    pageIndex++;
  }

  return { products: allProducts, cancelledIds: allCancelledIds };
}
