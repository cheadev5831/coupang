<template>
  <div class="card-base section-gap">
    <!-- 상단 행: 연도 컨트롤 -->
    <div class="month-selector__top-row">
      <div class="month-selector__year-control">
        <q-btn
          flat
          round
          dense
          icon="chevron_left"
          color="grey-7"
          size="sm"
          @click="prevYear"
        />
        <span class="month-selector__year-label">{{ year }}년</span>
        <q-btn
          flat
          round
          dense
          icon="chevron_right"
          color="grey-7"
          size="sm"
          :disable="year >= currentYear"
          @click="nextYear"
        />
      </div>
    </div>

    <!-- 월 버튼 가로 스크롤 -->
    <div class="month-selector__months">
      <q-btn
        v-for="m in 12"
        :key="m"
        :label="`${m}월`"
        :color="selectedMonth === m ? 'primary' : 'grey-2'"
        :text-color="selectedMonth === m ? 'white' : 'grey-7'"
        unelevated
        dense
        no-caps
        size="sm"
        :disable="loading"
        :class="[
          'month-selector__month-btn',
          selectedMonth === m ? 'month-selector__month-btn--active' : '',
        ]"
        @click="selectMonth(m)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import 'src/css/month-selector.css';
import type { SelectedMonth } from 'src/data/default';

const props = defineProps<{
  modelValue: SelectedMonth;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: SelectedMonth];
  fetch: [];
}>();

const currentYear = new Date().getFullYear();
const year = ref(props.modelValue.year);
const selectedMonth = ref(props.modelValue.month);

watch(
  () => props.modelValue,
  (val) => {
    year.value = val.year;
    selectedMonth.value = val.month;
  },
);

function prevYear() {
  year.value--;
  emitUpdate();
}

function nextYear() {
  if (year.value < currentYear) {
    year.value++;
    emitUpdate();
  }
}

function selectMonth(m: number) {
  selectedMonth.value = m;
  emitUpdate();
  emit('fetch');
}

function emitUpdate() {
  emit('update:modelValue', { year: year.value, month: selectedMonth.value });
}
</script>
