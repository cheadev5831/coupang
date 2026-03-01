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
      :model-value="selectedMonth"
      :loading="isFetching"
      @update:model-value="Object.assign(selectedMonth, $event)"
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
      :cancelled-ids="currentCancelledIds"
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

import { fetchOrders } from 'src/services/orderService';

// ─────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────

const cookieState = reactive<CookieState>({ ...defaultCookieState });
const selectedMonth = reactive<SelectedMonth>({ ...defaultSelectedMonth });
const monthCacheMap = reactive<Map<MonthCacheKey, MonthCache>>(new Map());
const checkedItems = reactive<CheckedItemsMap>(new Map());
const isFetching = ref(false);
const errorMessage = ref('');
const showCookieWarning = ref(false);
const hasFetched = ref(false);

// ─────────────────────────────────────────────
// 캐시 키
// ─────────────────────────────────────────────

const currentCacheKey = computed<MonthCacheKey>(
  () => `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`,
);

const currentCache = computed(() => monthCacheMap.get(currentCacheKey.value));

const currentProducts = computed<ProductRow[]>(() => currentCache.value?.products ?? []);

const currentCancelledIds = computed<Set<string>>(
  () => currentCache.value?.cancelledIds ?? new Set(),
);

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
  if (!cookieState.isSet || !cookieState.value) {
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
    const { products, cancelledIds } = await fetchOrders(
      selectedMonth.year,
      selectedMonth.month,
      cookieState.value,
    );

    monthCacheMap.set(currentCacheKey.value, {
      key: currentCacheKey.value,
      products,
      cancelledIds,
      cachedAt: new Date().toISOString(),
      status: 'success',
      errorMessage: null,
    });

    hasFetched.value = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    errorMessage.value = `조회 중 오류가 발생했습니다. 쿠키를 확인해 주세요. (${message})`;
    monthCacheMap.set(currentCacheKey.value, {
      key: currentCacheKey.value,
      products: [],
      cancelledIds: new Set(),
      cachedAt: new Date().toISOString(),
      status: 'error',
      errorMessage: message,
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
</script>
