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
      :all-months-with-data="monthsWithDataByYear"
      @update:model-value="Object.assign(selectedMonth, $event)"
      @fetch="onFetch"
    />

    <!-- 저장 실패 배너 -->
    <q-banner
      v-if="saveErrorMessage"
      dense
      rounded
      class="bg-orange-1 text-orange-9 section-gap"
      icon="cloud_off"
    >
      {{ saveErrorMessage }}
      <template #action>
        <q-btn flat dense size="sm" label="닫기" @click="saveErrorMessage = ''" />
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

import CookiePanel from 'components/CookiePanel.vue';
import MonthSelector from 'components/MonthSelector.vue';
import SummaryBar from 'components/SummaryBar.vue';
import ProductList from 'components/ProductList.vue';

import {
  COOKIE_STORAGE_KEY,
  defaultCookieState,
  defaultSelectedMonth,
  type CookieState,
  type SelectedMonth,
} from 'src/models/app';
import type { ProductRow, OrderSummary } from 'src/models/order';

import { fetchOrders } from 'src/services/orderService';
import {
  loadOrdersFromFirestore,
  saveOrdersToFirestore,
  deleteOrdersFromFirestore,
  listDataMonths,
} from 'src/services/firestoreService';

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
const currentProducts = ref<ProductRow[]>([]);
const currentCheckedIds = ref<Set<string>>(new Set());
const isFetching = ref(false);
const isSaving = ref(false);
const isRefetching = ref(false);
const errorMessage = ref('');
const saveErrorMessage = ref('');
const showCookieWarning = ref(false);
const hasFetched = ref(false);

// ─────────────────────────────────────────────
// Firestore 기반 has-data 월 목록
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
// 금액 집계
// ─────────────────────────────────────────────

const summary = computed<OrderSummary>(() => {
  const products = currentProducts.value;
  const checked = currentCheckedIds.value;

  if (products.length === 0) return { totalAmount: 0, checkedAmount: 0, totalCount: 0, checkedCount: 0 };

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
  currentProducts.value = [];
  currentCheckedIds.value = new Set();
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
  currentProducts.value = [];
  currentCheckedIds.value = new Set();
  isFetching.value = true;
  hasFetched.value = false;

  const yyyymm = `${selectedMonth.year}${String(selectedMonth.month).padStart(2, '0')}`;

  try {
    // 1. Firestore 우선 로드
    const savedData = await loadOrdersFromFirestore(yyyymm);
    if (savedData) {
      currentProducts.value = savedData.products;
      currentCheckedIds.value = savedData.checkedIds;
      addToDataMonths(selectedMonth.year, selectedMonth.month);
      hasFetched.value = true;
      return;
    }

    // 2. Firestore에 없음 → 모바일은 여기서 종료
    if (!isDesktop.value) {
      hasFetched.value = true;
      return;
    }

    // 3. PC: 쿠팡 API fallback
    if (!cookieState.isSet || !cookieState.value) {
      showCookieWarning.value = true;
      return;
    }

    const { products } = await fetchOrders(
      selectedMonth.year,
      selectedMonth.month,
      cookieState.value,
    );

    currentProducts.value = products;
    hasFetched.value = true;

    // Firestore 자동 저장 (데이터 없으면 저장 생략)
    if (products.length > 0) {
      saveErrorMessage.value = '';
      try {
        await saveOrdersToFirestore(yyyymm, products, new Set());
        addToDataMonths(selectedMonth.year, selectedMonth.month);
      } catch (saveErr) {
        const msg = saveErr instanceof Error ? saveErr.message : '알 수 없는 오류';
        saveErrorMessage.value = `저장 실패: ${msg}`;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    errorMessage.value = `조회 중 오류가 발생했습니다. 쿠키를 확인해 주세요. (${message})`;
  } finally {
    isFetching.value = false;
  }
}

// ─────────────────────────────────────────────
// 체크박스 이벤트
// ─────────────────────────────────────────────

function onToggle(id: string) {
  const set = new Set(currentCheckedIds.value);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  currentCheckedIds.value = set;
}

async function onRefetch() {
  const yyyymm = `${selectedMonth.year}${String(selectedMonth.month).padStart(2, '0')}`;
  isRefetching.value = true;
  saveErrorMessage.value = '';
  errorMessage.value = '';

  try {
    // Firestore 문서 삭제 (없으면 무시하고 진행)
    try {
      await deleteOrdersFromFirestore(yyyymm);
      const map = new Map(monthsWithDataByYear.value);
      const filtered = (map.get(selectedMonth.year) ?? []).filter((m) => m !== selectedMonth.month);
      if (filtered.length > 0) {
        map.set(selectedMonth.year, filtered);
      } else {
        map.delete(selectedMonth.year);
      }
      monthsWithDataByYear.value = map;
    } catch {
      // 삭제 실패 시 그냥 재조회
    }
  } finally {
    isRefetching.value = false;
  }

  // 쿠팡 API 재조회 → 성공 시 Firestore 자동 저장
  await onFetch();
}

async function onSave() {
  const yyyymm = `${selectedMonth.year}${String(selectedMonth.month).padStart(2, '0')}`;
  isSaving.value = true;
  saveErrorMessage.value = '';
  try {
    await saveOrdersToFirestore(yyyymm, currentProducts.value, currentCheckedIds.value);
    addToDataMonths(selectedMonth.year, selectedMonth.month);
    $q.notify({ type: 'positive', message: '저장되었습니다.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    saveErrorMessage.value = `저장 실패: ${msg}`;
  } finally {
    isSaving.value = false;
  }
}

function onToggleAll(checked: boolean) {
  if (checked) {
    currentCheckedIds.value = new Set(currentProducts.value.map((p) => p.id));
  } else {
    currentCheckedIds.value = new Set();
  }
}
</script>
