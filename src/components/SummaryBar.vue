<template>
  <div class="summary-bar">

    <!-- 중앙: 금액 + 서브 정보 -->
    <div class="summary-bar__main">
      <span class="summary-bar__meta">
        전체 {{ formatAmount(summary.totalAmount) }}원 &nbsp;·&nbsp; {{ summary.checkedCount }}/{{ summary.totalCount }}개 선택
      </span>
    </div>

  </div>
</template>

<script setup lang="ts">
import 'src/css/summary-bar.css';
import type { OrderSummary } from 'src/models/order';

defineProps<{
  summary: OrderSummary;
}>();

function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR');
}
</script>
