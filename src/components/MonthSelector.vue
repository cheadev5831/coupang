<template>
  <div class="card-base section-gap">
    <div class="month-selector__row">
      <!-- DatePicker 트리거 -->
      <div
        class="month-selector__trigger"
        :class="{ 'month-selector__trigger--disabled': loading }"
      >
        <span class="month-selector__value"
          >{{ String(year).slice(-2) }}년<br />{{ String(selectedMonth).padStart(2, '0') }}월</span
        >
        <q-spinner v-if="loading" color="grey-4" size="13px" class="month-selector__spinner" />
        <q-icon v-else name="keyboard_arrow_down" size="16px" class="month-selector__arrow" />

        <q-popup-proxy
          ref="qDatePopup"
          transition-show="scale"
          transition-hide="scale"
          :disable="loading"
        >
          <div class="month-selector__date-popup">
            <div class="month-selector__year-nav">
              <q-btn
                flat
                round
                dense
                icon="chevron_left"
                class="month-selector__year-btn"
                :disable="popupYear <= 2010"
                @click.stop="popupYear--"
              />
              <span class="month-selector__year-label">{{ popupYear }}년</span>
              <q-btn
                flat
                round
                dense
                icon="chevron_right"
                class="month-selector__year-btn"
                :disable="popupYear >= currentYear"
                @click.stop="popupYear++"
              />
            </div>
            <q-date
              :model-value="popupYear + '/' + String(selectedMonth).padStart(2, '0')"
              mask="YYYY/MM"
              default-view="Months"
              :navigation-max-year-month="currentYear + '/12'"
              emit-immediately
              minimal
              @update:model-value="onDateSelect"
            />
          </div>
        </q-popup-proxy>
      </div>

      <!-- 세로 구분선 -->
      <q-separator vertical class="month-selector__divider" />

      <!-- 금액 요약 -->
      <div class="month-selector__amounts">
        <div class="month-selector__amount-item">
          <q-icon name="receipt_long" size="13px" class="month-selector__amount-icon--order" />
          <span class="month-selector__amount-label">주문</span>
          <span class="month-selector__amount-value month-selector__amount-value--order">{{
            orderAmountLabel
          }}</span>
        </div>
        <div class="month-selector__amount-item">
          <q-icon name="add_shopping_cart" size="13px" class="month-selector__amount-icon--user" />
          <span class="month-selector__amount-label">추가</span>
          <span class="month-selector__amount-value month-selector__amount-value--user">{{
            userAmountLabel
          }}</span>
        </div>
        <div class="month-selector__amount-item month-selector__amount-item--total">
          <q-icon name="functions" size="13px" class="month-selector__amount-icon--total" />
          <span class="month-selector__amount-label">합계</span>
          <span class="month-selector__amount-value month-selector__amount-value--total">{{
            totalAmountLabel
          }}</span>
        </div>
      </div>

      <!-- 세로 구분선 -->
      <q-separator vertical class="month-selector__divider" />

      <!-- 액션 버튼 그룹 -->
      <div class="month-selector__actions">
        <q-btn
          v-if="showRefetch"
          class="month-selector__btn month-selector__btn--refetch"
          unelevated
          :loading="isRefetching"
          :disable="isRefetching || isSaving || isFetching"
          icon="refresh"
          label="재조회"
          @click="emit('refetch')"
        />
        <ChartModal />
        <q-btn
          class="month-selector__btn month-selector__btn--save"
          unelevated
          :loading="isSaving"
          :disable="!hasFetched || isSaving"
          icon="cloud_upload"
          label="저장"
          @click="emit('save')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import 'src/css/month-selector.css';
import type { SelectedMonth } from 'src/models/app';
import type { OrderSummary } from 'src/models/order';
import ChartModal from 'components/ChartModal.vue';

const props = defineProps<{
  modelValue: SelectedMonth;
  loading?: boolean;
  monthsWithData?: number[];
  allMonthsWithData?: Map<number, number[]>;
  summary?: OrderSummary;
  userTotal?: number;
  isSaving?: boolean;
  isRefetching?: boolean;
  isFetching?: boolean;
  showRefetch?: boolean;
  hasFetched?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: SelectedMonth];
  fetch: [];
  save: [];
  refetch: [];
}>();

const currentYear = new Date().getFullYear();
const year = ref(props.modelValue.year);
const selectedMonth = ref(props.modelValue.month);
const popupYear = ref(props.modelValue.year);
const qDatePopup = ref<{ hide: () => void }>();

const orderAmountLabel = computed(() =>
  props.summary !== undefined ? props.summary.checkedAmount.toLocaleString('ko-KR') + '원' : '—',
);

const userAmountLabel = computed(() =>
  props.userTotal !== undefined ? props.userTotal.toLocaleString('ko-KR') + '원' : '—',
);

const totalAmountLabel = computed(() => {
  const order = props.summary?.checkedAmount;
  const user = props.userTotal;
  if (order === undefined && user === undefined) return '—';
  return ((order ?? 0) + (user ?? 0)).toLocaleString('ko-KR') + '원';
});

watch(
  () => props.modelValue,
  (val) => {
    year.value = val.year;
    selectedMonth.value = val.month;
    popupYear.value = val.year;
  },
);

function onDateSelect(val: string) {
  year.value = popupYear.value;
  selectMonth(Number(val.slice(5, 7)));
  qDatePopup.value?.hide();
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
