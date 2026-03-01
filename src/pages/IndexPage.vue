<template>
  <q-page class="app-page">
    <!-- 쿠키 설정 패널 -->
    <CookiePanel
      :cookie-state="cookieState"
      @save="onCookieSave"
      @clear="onCookieClear"
    />

    <!-- GitHub 연동 패널 -->
    <GithubPanel
      :github-state="githubState"
      @save="onGithubSave"
      @clear="onGithubClear"
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

    <!-- GitHub 저장 상태 배너 -->
    <q-banner
      v-if="githubSaveStatus === 'saving'"
      dense
      rounded
      class="bg-blue-1 text-blue-9 section-gap"
      icon="cloud_upload"
    >
      GitHub에 데이터를 저장하는 중입니다...
    </q-banner>
    <q-banner
      v-if="githubSaveStatus === 'success'"
      dense
      rounded
      class="bg-green-1 text-green-9 section-gap"
      icon="cloud_done"
    >
      GitHub에 저장 완료! 약 1~2분 후 다른 브라우저에서도 조회 가능합니다.
      <template #action>
        <q-btn flat dense size="sm" label="닫기" @click="githubSaveStatus = 'idle'" />
      </template>
    </q-banner>
    <q-banner
      v-if="githubSaveStatus === 'error'"
      dense
      rounded
      class="bg-orange-1 text-orange-9 section-gap"
      icon="cloud_off"
    >
      GitHub 저장에 실패했습니다. 토큰/레포 설정을 확인해 주세요.
      <template #action>
        <q-btn flat dense size="sm" label="닫기" @click="githubSaveStatus = 'idle'" />
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
import { ref, reactive, computed, watch, onMounted } from 'vue';
import 'src/css/layout.css';

import CookiePanel from 'components/CookiePanel.vue';
import GithubPanel from 'components/GithubPanel.vue';
import MonthSelector from 'components/MonthSelector.vue';
import SummaryBar from 'components/SummaryBar.vue';
import ProductList from 'components/ProductList.vue';

import {
  COOKIE_STORAGE_KEY,
  GITHUB_TOKEN_KEY,
  GITHUB_REPO_KEY,
  defaultCookieState,
  defaultSelectedMonth,
  defaultOrderSummary,
  defaultGithubState,
  type CookieState,
  type SelectedMonth,
  type ProductRow,
  type MonthCache,
  type MonthCacheKey,
  type CheckedItemsMap,
  type OrderSummary,
  type GithubState,
} from 'src/data/default';

import { fetchOrders, loadOrdersFromStaticFile } from 'src/services/orderService';
import { saveOrdersToGithub } from 'src/services/githubService';

// ─────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────

const cookieState = reactive<CookieState>({ ...defaultCookieState });
const githubState = reactive<GithubState>({ ...defaultGithubState });
const selectedMonth = reactive<SelectedMonth>({ ...defaultSelectedMonth });
const monthCacheMap = reactive<Map<MonthCacheKey, MonthCache>>(new Map());
const checkedItems = reactive<CheckedItemsMap>(new Map());
const isFetching = ref(false);
const errorMessage = ref('');
const showCookieWarning = ref(false);
const hasFetched = ref(false);
const githubSaveStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle');

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
// 초기화: localStorage 로드
// ─────────────────────────────────────────────

(function loadFromStorage() {
  const storedCookie = localStorage.getItem(COOKIE_STORAGE_KEY);
  if (storedCookie) {
    cookieState.value = storedCookie;
    cookieState.isSet = true;
    cookieState.savedAt = new Date().toLocaleDateString('ko-KR');
  }

  const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
  const storedRepo = localStorage.getItem(GITHUB_REPO_KEY);
  if (storedToken) {
    githubState.token = storedToken;
    githubState.repo = storedRepo ?? defaultGithubState.repo;
    githubState.isSet = true;
  }
})();

// ─────────────────────────────────────────────
// 정적 JSON 자동 로드
// ─────────────────────────────────────────────

async function tryLoadFromStaticFile() {
  const key = currentCacheKey.value;
  if (monthCacheMap.get(key)?.status === 'success') return;

  const result = await loadOrdersFromStaticFile(selectedMonth.year, selectedMonth.month);
  if (!result) return;

  monthCacheMap.set(key, {
    key,
    products: result.products,
    cancelledIds: result.cancelledIds,
    cachedAt: new Date().toISOString(),
    status: 'success',
    errorMessage: null,
  });
  hasFetched.value = true;
}

// 앱 진입 시 현재 월 자동 로드
onMounted(() => {
  void tryLoadFromStaticFile();
});

// 월 변경 시 자동 로드
watch(currentCacheKey, () => {
  void tryLoadFromStaticFile();
});

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
// GitHub 이벤트
// ─────────────────────────────────────────────

function onGithubSave(token: string, repo: string) {
  localStorage.setItem(GITHUB_TOKEN_KEY, token);
  localStorage.setItem(GITHUB_REPO_KEY, repo);
  githubState.token = token;
  githubState.repo = repo;
  githubState.isSet = true;
}

function onGithubClear() {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
  localStorage.removeItem(GITHUB_REPO_KEY);
  githubState.token = null;
  githubState.repo = defaultGithubState.repo;
  githubState.isSet = false;
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

    // GitHub에 저장 (토큰이 설정된 경우)
    if (githubState.isSet && githubState.token) {
      githubSaveStatus.value = 'saving';
      saveOrdersToGithub(
        githubState.token,
        githubState.repo,
        selectedMonth.year,
        selectedMonth.month,
        products,
        cancelledIds,
      )
        .then(() => {
          githubSaveStatus.value = 'success';
        })
        .catch(() => {
          githubSaveStatus.value = 'error';
        });
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
