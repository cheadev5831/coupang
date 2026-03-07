/**
 * Coupang 주문 목록 API 응답 타입
 *
 * 엔드포인트: GET https://mc.coupang.com/ssr/api/myorders/model/page
 * 파라미터: requestYear, pageIndex, size
 * 헤더: Cookie (사용자 세션 쿠키)
 *
 * 참고: src/precode.js (Google Apps Script 검증 코드)
 */

export interface CoupangApiProduct {
  /** 상품명 */
  productName: string;
  /** 할인 적용 단가 */
  discountedUnitPrice: number;
  /** 수량 */
  quantity: number;
  /** 상품 이미지 경로 URL */
  imagePath: string;
  /** 벤더 아이템 ID (배송비 묶음 매핑에 사용) */
  vendorItemId: number;
}

export interface CoupangBundleReceipt {
  /** 묶음 배송비 */
  shippingFee?: number;
  /** 묶음에 포함된 vendorItemId 목록 */
  vendorItemIds?: number[];
}

export interface CoupangDeliveryGroup {
  /** 배송 그룹 상태 (예: 'CANCEL', 'RETURN_COMPLETE', 'DELIVERED' 등) */
  groupStatus?: {
    status: string;
  };
  productList: CoupangApiProduct[];
}

export interface CoupangOrder {
  /** 주문 번호 */
  orderId: string | number;
  /** 주문 일시 (Unix timestamp ms) */
  orderedAt: number;
  deliveryGroupList: CoupangDeliveryGroup[];
  /** 묶음 배송 영수증 목록 */
  bundleReceiptList?: CoupangBundleReceipt[];
}

export interface CoupangOrderListResponse {
  orderList: CoupangOrder[];
}
