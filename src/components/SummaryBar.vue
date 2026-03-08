<template>
  <div class="summary-bar">

    <!-- 왼쪽: 전체선택 -->
    <div class="summary-bar__toggle">
      <q-checkbox
        :model-value="checkboxState"
        :indeterminate-value="null"
        color="secondary"
        keep-color
        dark
        dense
        :disable="summary.totalCount === 0"
        @click="onToggleAll"
      />
      <span class="summary-bar__toggle-label">전체선택</span>
    </div>

    <!-- 중앙: 금액 + 서브 정보 -->
    <div class="summary-bar__main">
      <span class="summary-bar__checked-amount">{{ formatAmount(summary.checkedAmount) }}원</span>
      <span class="summary-bar__meta">
        전체 {{ formatAmount(summary.totalAmount) }}원 &nbsp;·&nbsp; {{ summary.checkedCount }}/{{ summary.totalCount }}개 선택
      </span>
    </div>

    <!-- 재조회 버튼 (PC 전용) -->
    <q-btn
      v-if="showRefetch"
      class="summary-bar__refetch-btn"
      unelevated
      :loading="isRefetching"
      :disable="isRefetching || isSaving || isFetching"
      icon="refresh"
      label="재조회"
      @click="emit('refetch')"
    />

    <!-- 차트 버튼 + 모달 -->
    <ChartModal />

    <!-- 저장 버튼 -->
    <q-btn
      class="summary-bar__save-btn"
      unelevated
      :loading="isSaving"
      :disable="summary.totalCount === 0 || isSaving"
      icon="cloud_upload"
      label="저장"
      @click="emit('save')"
    />

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import 'src/css/summary-bar.css';
import type { OrderSummary } from 'src/models/order';
import ChartModal from 'components/ChartModal.vue';

const props = defineProps<{
  summary: OrderSummary;
  isSaving?: boolean;
  isRefetching?: boolean;
  isFetching?: boolean;
  showRefetch?: boolean;
}>();

const emit = defineEmits<{
  'toggle-all': [checked: boolean];
  'save': [];
  'refetch': [];
}>();

const checkboxState = computed<boolean | null>(() => {
  const { checkedCount, totalCount } = props.summary;
  if (totalCount === 0 || checkedCount === 0) return false;
  if (checkedCount === totalCount) return true;
  return null;
});

function onToggleAll() {
  emit('toggle-all', checkboxState.value !== true);
}

function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR');
}
</script>
