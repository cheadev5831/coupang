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

export interface UserItem {
  id: string;
  name: string;
  price: number;
  createdAt: string; // YYYYMMDD
}

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

