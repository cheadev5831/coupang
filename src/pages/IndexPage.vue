<template>
  <q-page class="app-page">
    <!-- 쿠키 설정 패널 (PC 전용) -->
    <CookiePanel
      v-if="isDesktop"
      :cookie-state="cookieState"
      @save="onCookieSave"
      @clear="onCookieClear"
    />

    <!-- 월 선택 + 조회 버튼 -->
    <MonthSelector
      :model-value="selectedMonth"
      :loading="isFetching"
      :months-with-data="monthsWithData"
      @update:model-value="Object.assign(selectedMonth, $event)"
      @fetch="onFetch"
    />

    <!-- GitHub 저장 실패 배너 -->
    <q-banner
      v-if="githubErrorMessage"
      dense
      rounded
      class="bg-orange-1 text-orange-9 section-gap"
      icon="cloud_off"
    >
      {{ githubErrorMessage }}
      <template #action>
        <q-btn flat dense size="sm" label="닫기" @click="githubErrorMessage = ''" />
      </template>
    </q-banner>

    <!-- 쿠키 미설정 안내 배너 (PC 전용) -->
    <q-banner
      v-if="isDesktop && showCookieWarning"
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
      :is-saving="isSaving"
      :is-refetching="isRefetching"
      :is-fetching="isFetching"
      :show-refetch="isDesktop"
      @toggle-all="onToggleAll"
      @save="onSave"
      @refetch="onRefetch"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
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
import { saveOrdersToGitHub, loadOrdersFromGitHub, listDataMonths, deleteOrdersFromGitHub } from 'src/services/githubService';

// ─────────────────────────────────────────────
// 플랫폼
// ─────────────────────────────────────────────

const $q = useQuasar();
const isDesktop = computed(() => $q.platform.is.desktop);

// ─────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────

const cookieState = reactive<CookieState>({ ...defaultCookieState });
const selectedMonth = reactive<SelectedMonth>({ ...defaultSelectedMonth });
const monthCacheMap = reactive<Map<MonthCacheKey, MonthCache>>(new Map());
const checkedItems = reactive<CheckedItemsMap>(new Map());
const isFetching = ref(false);
const isSaving = ref(false);
const isRefetching = ref(false);
const errorMessage = ref('');
const githubErrorMessage = ref('');
const showCookieWarning = ref(false);
const hasFetched = ref(false);

// ─────────────────────────────────────────────
// GitHub 기반 has-data 월 목록
// ─────────────────────────────────────────────

const monthsWithDataByYear = ref<Map<number, number[]>>(new Map());

const monthsWithData = computed<number[]>(
  () => monthsWithDataByYear.value.get(selectedMonth.year) ?? [],
);

function addToDataMonths(year: number, month: number) {
  const map = new Map(monthsWithDataByYear.value);
  const months = map.get(year) ?? [];
  if (!months.includes(month)) {
    map.set(year, [...months, month]);
    monthsWithDataByYear.value = map;
  }
}

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
// 초기 자동 조회
// ─────────────────────────────────────────────

onMounted(() => {
  void onFetch();
  void listDataMonths().then((entries) => {
    const map = new Map<number, number[]>();
    for (const { year, month } of entries) {
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(month);
    }
    monthsWithDataByYear.value = map;
  });
});

// ─────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────

async function onFetch() {
  showCookieWarning.value = false;
  errorMessage.value = '';

  // 세션 캐시 히트
  if (monthCacheMap.get(currentCacheKey.value)?.status === 'success') {
    hasFetched.value = true;
    return;
  }

  checkedItems.set(currentCacheKey.value, new Set());
  isFetching.value = true;
  hasFetched.value = false;

  const yyyymm = `${selectedMonth.year}${String(selectedMonth.month).padStart(2, '0')}`;

  try {
    // 1. GitHub 우선 로드 시도
    const githubData = await loadOrdersFromGitHub(yyyymm);
    if (githubData) {
      monthCacheMap.set(currentCacheKey.value, {
        key: currentCacheKey.value,
        products: githubData.products,
        cancelledIds: githubData.cancelledIds,
        cachedAt: new Date().toISOString(),
        status: 'success',
        errorMessage: null,
      });
      checkedItems.set(currentCacheKey.value, githubData.checkedIds);
      addToDataMonths(selectedMonth.year, selectedMonth.month);
      hasFetched.value = true;
      return;
    }

    // 2. GitHub에 없음 → 모바일은 여기서 종료 (JSON 뷰어 전용)
    if (!isDesktop.value) {
      hasFetched.value = true;
      return;
    }

    // 3. PC: 쿠팡 API fallback
    if (!cookieState.isSet || !cookieState.value) {
      showCookieWarning.value = true;
      return;
    }

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

    // GitHub 자동 저장 (데이터 없으면 업로드 생략)
    if (products.length > 0) {
      githubErrorMessage.value = '';
      try {
        await saveOrdersToGitHub(yyyymm, products, cancelledIds, new Set());
        addToDataMonths(selectedMonth.year, selectedMonth.month);
      } catch (githubErr) {
        const msg = githubErr instanceof Error ? githubErr.message : '알 수 없는 오류';
        githubErrorMessage.value = `GitHub 저장 실패: ${msg}`;
      }
    }
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

async function onRefetch() {
  const yyyymm = `${selectedMonth.year}${String(selectedMonth.month).padStart(2, '0')}`;
  isRefetching.value = true;
  githubErrorMessage.value = '';
  errorMessage.value = '';

  try {
    // GitHub 파일 삭제 (없으면 무시하고 진행)
    try {
      await deleteOrdersFromGitHub(yyyymm);
      // monthsWithData에서 해당 월 제거
      const map = new Map(monthsWithDataByYear.value);
      const filtered = (map.get(selectedMonth.year) ?? []).filter((m) => m !== selectedMonth.month);
      if (filtered.length > 0) {
        map.set(selectedMonth.year, filtered);
      } else {
        map.delete(selectedMonth.year);
      }
      monthsWithDataByYear.value = map;
    } catch {
      // 파일 없거나 삭제 실패 시 그냥 재조회
    }

    // 세션 캐시 제거 (onFetch 캐시 히트 방지)
    monthCacheMap.delete(currentCacheKey.value);
    hasFetched.value = false;
  } finally {
    isRefetching.value = false;
  }

  // 쿠팡 API 재조회 → 성공 시 GitHub 자동 저장
  await onFetch();
}

async function onSave() {
  const yyyymm = `${selectedMonth.year}${String(selectedMonth.month).padStart(2, '0')}`;
  isSaving.value = true;
  githubErrorMessage.value = '';
  try {
    await saveOrdersToGitHub(yyyymm, currentProducts.value, currentCancelledIds.value, currentCheckedIds.value);
    addToDataMonths(selectedMonth.year, selectedMonth.month);
    $q.notify({ type: 'positive', message: 'GitHub에 저장되었습니다.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    githubErrorMessage.value = `GitHub 저장 실패: ${msg}`;
  } finally {
    isSaving.value = false;
  }
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
