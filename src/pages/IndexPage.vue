<template>
  <q-page class="app-page">
    <!-- 쿠키 설정 패널 -->
    <CookiePanel
      :cookie-state="cookieState"
      @save="onCookieSave"
      @clear="onCookieClear"
    />

    <!-- 월 선택 + 조회 버튼 -->
    <MonthSelector
      v-model="selectedMonth"
      :loading="isFetching"
      @fetch="onFetch"
    />

    <!-- 쿠키 미설정 안내 배너 -->
    <q-banner
      v-if="showCookieWarning"
      dense
      rounded
      class="bg-orange-1 text-orange-9 section-gap"
      icon="warning_amber"
    >
      쿠키를 먼저 입력하고 저장해 주세요.
      <template #action>
        <q-btn flat dense size="sm" label="닫기" @click="showCookieWarning = false" />
      </template>
    </q-banner>

    <!-- 에러 배너 -->
    <q-banner
      v-if="errorMessage"
      dense
      rounded
      class="bg-red-1 text-red-9 section-gap"
      icon="error_outline"
    >
      {{ errorMessage }}
      <template #action>
        <q-btn flat dense size="sm" label="닫기" @click="errorMessage = ''" />
      </template>
    </q-banner>

    <!-- 상품 목록 -->
    <ProductList
      :products="currentProducts"
      :checked-ids="currentCheckedIds"
      :cancelled-ids="cancelledIds"
      :loading="isFetching"
      :has-fetched="hasFetched"
      @toggle="onToggle"
    />

    <!-- 하단 고정 금액 집계 바 -->
    <SummaryBar
      :summary="summary"
      @toggle-all="onToggleAll"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import 'src/css/layout.css';

import CookiePanel from 'components/CookiePanel.vue';
import MonthSelector from 'components/MonthSelector.vue';
import SummaryBar from 'components/SummaryBar.vue';
import ProductList from 'components/ProductList.vue';

import {
  COOKIE_STORAGE_KEY,
  defaultCookieState,
  defaultSelectedMonth,
  defaultOrderSummary,
  type CookieState,
  type SelectedMonth,
  type ProductRow,
  type MonthCache,
  type MonthCacheKey,
  type CheckedItemsMap,
  type OrderSummary,
} from 'src/data/default';

// ─────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────

const cookieState = reactive<CookieState>({ ...defaultCookieState });
let selectedMonth = reactive<SelectedMonth>({ ...defaultSelectedMonth });
const monthCacheMap = reactive<Map<MonthCacheKey, MonthCache>>(new Map());
const checkedItems = reactive<CheckedItemsMap>(new Map());
const isFetching = ref(false);
const errorMessage = ref('');
const showCookieWarning = ref(false);
const hasFetched = ref(false);

// 취소/반품 상품 ID 집합 (API 파싱 후 채워질 예정)
const cancelledIds = ref<Set<string>>(new Set());

// ─────────────────────────────────────────────
// 캐시 키
// ─────────────────────────────────────────────

const currentCacheKey = computed<MonthCacheKey>(
  () => `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`,
);

const currentCache = computed(() => monthCacheMap.get(currentCacheKey.value));

const currentProducts = computed<ProductRow[]>(() => currentCache.value?.products ?? []);

const currentCheckedIds = computed<Set<string>>(
  () => checkedItems.get(currentCacheKey.value) ?? new Set(),
);

// ─────────────────────────────────────────────
// 금액 집계
// ─────────────────────────────────────────────

const summary = computed<OrderSummary>(() => {
  const products = currentProducts.value;
  const checked = currentCheckedIds.value;

  if (products.length === 0) return { ...defaultOrderSummary };

  const checkedProducts = products.filter((p) => checked.has(p.id));
  return {
    totalAmount: products.reduce((sum, p) => sum + p.price, 0),
    checkedAmount: checkedProducts.reduce((sum, p) => sum + p.price, 0),
    totalCount: products.length,
    checkedCount: checkedProducts.length,
  };
});

// ─────────────────────────────────────────────
// 초기화: localStorage 쿠키 로드
// ─────────────────────────────────────────────

(function loadCookieFromStorage() {
  const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
  if (stored) {
    cookieState.value = stored;
    cookieState.isSet = true;
    cookieState.savedAt = new Date().toLocaleDateString('ko-KR');
  }
})();

// ─────────────────────────────────────────────
// 쿠키 이벤트
// ─────────────────────────────────────────────

function onCookieSave(value: string) {
  localStorage.setItem(COOKIE_STORAGE_KEY, value);
  cookieState.value = value;
  cookieState.isSet = true;
  cookieState.savedAt = new Date().toLocaleDateString('ko-KR');
}

function onCookieClear() {
  localStorage.removeItem(COOKIE_STORAGE_KEY);
  cookieState.value = null;
  cookieState.isSet = false;
  cookieState.savedAt = null;
  monthCacheMap.clear();
  checkedItems.clear();
  hasFetched.value = false;
}

// ─────────────────────────────────────────────
// 조회 버튼
// ─────────────────────────────────────────────

async function onFetch() {
  if (!cookieState.isSet) {
    showCookieWarning.value = true;
    return;
  }

  showCookieWarning.value = false;
  errorMessage.value = '';

  // 캐시 히트
  const cached = monthCacheMap.get(currentCacheKey.value);
  if (cached && cached.status === 'success') {
    hasFetched.value = true;
    return;
  }

  // 체크 상태 초기화 (새 월 조회 시)
  checkedItems.set(currentCacheKey.value, new Set());

  isFetching.value = true;
  hasFetched.value = false;

  try {
    // TODO: 실제 API 호출로 교체 (quasar.config.ts 프록시 설정 필요)
    // const { data } = await api.get(API_CONFIG.ORDERS_ENDPOINT, {
    //   params: { year: selectedMonth.year, month: selectedMonth.month },
    //   headers: { Cookie: cookieState.value },
    // });
    // const products = parseOrderResponse(data);

    // 목업 데이터 (개발 중 UI 확인용)
    await new Promise((resolve) => setTimeout(resolve, 800));
    const { products, cancelled } = getMockProducts(selectedMonth.year, selectedMonth.month);
    cancelledIds.value = cancelled;

    monthCacheMap.set(currentCacheKey.value, {
      key: currentCacheKey.value,
      products,
      cachedAt: new Date().toISOString(),
      status: 'success',
      errorMessage: null,
    });

    hasFetched.value = true;
  } catch {
    errorMessage.value = '조회 중 오류가 발생했습니다. 쿠키를 확인해 주세요.';
    monthCacheMap.set(currentCacheKey.value, {
      key: currentCacheKey.value,
      products: [],
      cachedAt: new Date().toISOString(),
      status: 'error',
      errorMessage: '조회 실패',
    });
  } finally {
    isFetching.value = false;
  }
}

// ─────────────────────────────────────────────
// 체크박스 이벤트
// ─────────────────────────────────────────────

function onToggle(id: string) {
  const key = currentCacheKey.value;
  if (!checkedItems.has(key)) checkedItems.set(key, new Set());
  const set = checkedItems.get(key)!;
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  // Map 내부 Set 변경은 reactive가 감지하지 못하므로 새 Set으로 교체
  checkedItems.set(key, new Set(set));
}

function onToggleAll(checked: boolean) {
  const key = currentCacheKey.value;
  if (checked) {
    checkedItems.set(key, new Set(currentProducts.value.map((p) => p.id)));
  } else {
    checkedItems.set(key, new Set());
  }
}

// ─────────────────────────────────────────────
// 목업 데이터 (UI 개발용 — API 연동 후 제거)
// ─────────────────────────────────────────────

function getMockProducts(
  year: number,
  month: number,
): { products: ProductRow[]; cancelled: Set<string> } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = (d: number) => `${year}.${pad(month)}.${pad(d)}`;

  const img = (seed: number) => `https://picsum.photos/seed/${seed}/100/100`;

  const products: ProductRow[] = [
    {
      id: '28100173826621_0',
      orderId: '28100173826621',
      orderedAt: date(27),
      name: '[라엘] 순면커버 생리대 중형 16p',
      price: 10480,
      imageUrl: img(11),
    },
    {
      id: '28100173563918_0',
      orderId: '28100173563918',
      orderedAt: date(26),
      name: '샤인머스캣 1kg (국산)',
      price: 4980,
      imageUrl: img(22),
    },
    {
      id: '28100173563918_1',
      orderId: '28100173563918',
      orderedAt: date(26),
      name: '설향 딸기 대과 500g',
      price: 6170,
      imageUrl: img(33),
    },
    {
      id: '28100173563918_2',
      orderId: '28100173563918',
      orderedAt: date(26),
      name: '햇반 현미귀리볶음밥 210g x 3개입',
      price: 6500,
      imageUrl: img(44),
    },
    {
      id: '28100173563918_3',
      orderId: '28100173563918',
      orderedAt: date(26),
      name: '풀무원 참치 야채볶음밥 320g',
      price: 4980,
      imageUrl: img(55),
    },
    {
      id: '28100173382229_0',
      orderId: '28100173382229',
      orderedAt: date(25),
      name: '슈가펀 여성 크롭 반팔 티셔츠 (화이트/M)',
      price: 15400,
      imageUrl: img(66),
    },
    {
      id: '28100173201847_0',
      orderId: '28100173201847',
      orderedAt: date(23),
      name: 'LG 생활건강 페리오 46cm 치약 3개입',
      price: 3290,
      imageUrl: img(77),
    },
    {
      id: '28100173201847_1',
      orderId: '28100173201847',
      orderedAt: date(23),
      name: '클리어스틱 고체 방향제 화이트머스크 70g',
      price: 2980,
      imageUrl: img(88),
    },
    {
      id: '28100172954013_0',
      orderId: '28100172954013',
      orderedAt: date(20),
      name: '로켓배송 물티슈 캡형 100매 x 6개',
      price: 8900,
      imageUrl: img(99),
    },
    {
      id: '28100172954013_1',
      orderId: '28100172954013',
      orderedAt: date(20),
      name: '[반품] 주방 세제 500ml (취소처리)',
      price: 4500,
      imageUrl: null,
    },
  ];

  const cancelled = new Set(['28100172954013_1']);
  return { products, cancelled };
}
</script>
