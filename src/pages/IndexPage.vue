<template>
  <q-page class="app-page">
    <!-- 쿠키 설정 패널 (PC 전용) -->
    <CookiePanel
      v-if="isDesktop"
      :cookie-state="cookieState"
      @save="onCookieSave"
      @clear="onCookieClear"
    />

    <!-- GitHub 토큰 설정 패널 (PC 전용) -->
    <GitHubPanel
      v-if="isDesktop"
      :git-hub-state="gitHubState"
      @save="onGitHubSave"
      @clear="onGitHubClear"
    />

    <!-- 월 선택 + 조회 버튼 -->
    <MonthSelector
      :model-value="selectedMonth"
      :loading="isFetching"
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
      @toggle-all="onToggleAll"
      @save="onSave"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import 'src/css/layout.css';

import CookiePanel from 'components/CookiePanel.vue';
import GitHubPanel from 'components/GitHubPanel.vue';
import MonthSelector from 'components/MonthSelector.vue';
import SummaryBar from 'components/SummaryBar.vue';
import ProductList from 'components/ProductList.vue';

import {
  COOKIE_STORAGE_KEY,
  GITHUB_TOKEN_STORAGE_KEY,
  defaultCookieState,
  defaultGitHubState,
  defaultSelectedMonth,
  defaultOrderSummary,
  type CookieState,
  type GitHubState,
  type SelectedMonth,
  type ProductRow,
  type MonthCache,
  type MonthCacheKey,
  type CheckedItemsMap,
  type OrderSummary,
} from 'src/data/default';

import { fetchOrders } from 'src/services/orderService';
import { saveOrdersToGitHub, loadOrdersFromGitHub } from 'src/services/githubService';

// ─────────────────────────────────────────────
// 플랫폼
// ─────────────────────────────────────────────

const $q = useQuasar();
const isDesktop = computed(() => $q.platform.is.desktop);

// ─────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────

const cookieState = reactive<CookieState>({ ...defaultCookieState });
const gitHubState = reactive<GitHubState>({ ...defaultGitHubState });
const selectedMonth = reactive<SelectedMonth>({ ...defaultSelectedMonth });
const monthCacheMap = reactive<Map<MonthCacheKey, MonthCache>>(new Map());
const checkedItems = reactive<CheckedItemsMap>(new Map());
const isFetching = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const githubErrorMessage = ref('');
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

(function loadGitHubTokenFromStorage() {
  const stored = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
  if (stored) {
    gitHubState.token = stored;
    gitHubState.isSet = true;
    gitHubState.savedAt = new Date().toLocaleDateString('ko-KR');
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

function onGitHubSave(token: string) {
  localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);
  gitHubState.token = token;
  gitHubState.isSet = true;
  gitHubState.savedAt = new Date().toLocaleDateString('ko-KR');
}

function onGitHubClear() {
  localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
  gitHubState.token = null;
  gitHubState.isSet = false;
  gitHubState.savedAt = null;
}

// ─────────────────────────────────────────────
// 초기 자동 조회
// ─────────────────────────────────────────────

onMounted(() => {
  void onFetch();
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
    const githubData = await loadOrdersFromGitHub(yyyymm, gitHubState.token);
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

    // GitHub 저장 (토큰 설정 시에만)
    if (gitHubState.isSet && gitHubState.token) {
      githubErrorMessage.value = '';
      try {
        await saveOrdersToGitHub(yyyymm, products, cancelledIds, new Set(), gitHubState.token);
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

async function onSave() {
  const hasEnvToken = !!import.meta.env.VITE_GITHUB_TOKEN;
  if (!hasEnvToken && (!gitHubState.isSet || !gitHubState.token)) {
    $q.notify({ type: 'warning', message: 'GitHub 토큰을 먼저 설정해 주세요.' });
    return;
  }
  const yyyymm = `${selectedMonth.year}${String(selectedMonth.month).padStart(2, '0')}`;
  isSaving.value = true;
  githubErrorMessage.value = '';
  try {
    await saveOrdersToGitHub(yyyymm, currentProducts.value, currentCancelledIds.value, currentCheckedIds.value, gitHubState.token);
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
