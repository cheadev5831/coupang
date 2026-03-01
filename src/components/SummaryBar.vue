<template>
  <div class="summary-bar">
    <!-- 전체선택 토글 -->
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

    <div class="summary-bar__divider" />

    <!-- 전체 금액 (데스크탑에서만 노출) -->
    <div class="summary-bar__total-block">
      <span class="summary-bar__total-label">전체 금액</span>
      <span class="summary-bar__total-value">{{ formatAmount(summary.totalAmount) }}원</span>
    </div>

    <!-- 체크 금액 (핵심) -->
    <div class="summary-bar__amount-block">
      <span class="summary-bar__amount-label">체크 금액</span>
      <span class="summary-bar__amount-value">{{ formatAmount(summary.checkedAmount) }}원</span>
    </div>

    <div class="summary-bar__divider" />

    <!-- 선택 현황 -->
    <div class="summary-bar__count-block">
      <span class="summary-bar__count-selected">{{ summary.checkedCount }}개</span>
      <span class="summary-bar__count-total">/ {{ summary.totalCount }}개</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import 'src/css/summary-bar.css';
import type { OrderSummary } from 'src/data/default';

const props = defineProps<{
  summary: OrderSummary;
}>();

const emit = defineEmits<{
  'toggle-all': [checked: boolean];
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
