<template>
  <q-expansion-item
    class="card-base section-gap user-item-panel"
    header-class="user-item-panel__header"
    icon="add_shopping_cart"
    label="사용자 추가 목록"
    :caption="`${items.length}개 항목`"
    expand-icon-class="text-grey-5"
  >
    <!-- 입력 폼 -->
    <div class="user-item-panel__form">
      <q-input
        v-model="inputName"
        outlined
        dense
        placeholder="상품명"
        class="user-item-panel__input-name"
        bg-color="white"
      />
      <q-input
        v-model.number="inputPrice"
        outlined
        dense
        type="number"
        placeholder="금액"
        suffix="원"
        class="user-item-panel__input-price"
        bg-color="white"
      />
      <q-btn
        unelevated
        color="primary"
        icon="add"
        label="추가"
        dense
        no-caps
        class="user-item-panel__add-btn"
        :disable="!inputName || !inputPrice || isLoading"
        :loading="isLoading"
        @click="addItem"
      />
    </div>

    <!-- 목록 없을 때 -->
    <div v-if="items.length === 0" class="user-item-panel__empty">
      <q-icon name="inbox" size="28px" class="q-mb-xs" />
      <div>추가된 항목이 없습니다</div>
    </div>

    <!-- 상품 목록 -->
    <q-list v-else separator>
      <q-item
        v-for="item in items"
        :key="item.id"
        class="product-item product-item--checked"
      >
        <!-- 체크박스 (항상 체크) -->
        <q-item-section avatar class="product-item__check-section">
          <q-checkbox
            :model-value="true"
            color="primary"
            dense
            @click.stop
          />
        </q-item-section>

        <!-- 기본 이미지 플레이스홀더 -->
        <q-item-section avatar class="product-item__img-section">
          <div class="product-item__img-placeholder">
            <q-icon name="shopping_bag" color="grey-4" size="18px" />
          </div>
        </q-item-section>

        <!-- 상품명 -->
        <q-item-section>
          <q-item-label class="product-item__name product-item__name--checked">
            {{ item.name }}
          </q-item-label>
          <q-item-label class="product-item__meta">{{ item.createdAt ? formatDate(item.createdAt) : '사용자 추가' }}</q-item-label>
        </q-item-section>

        <!-- 가격 + 삭제 -->
        <q-item-section side>
          <div class="user-item-panel__price-row">
            <span
              :class="[
                'product-item__price',
                item.price < 0 ? 'product-item__price--negative-checked' : 'product-item__price--checked',
              ]"
            >
              {{ item.price.toLocaleString('ko-KR') }}원
            </span>
            <q-btn
              flat
              round
              dense
              icon="close"
              color="grey-5"
              size="xs"
              class="user-item-panel__delete-btn"
              @click.stop="removeItem(item.id)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import 'src/css/user-item-panel.css';
import type { SelectedMonth } from 'src/models/app';
import type { UserItem } from 'src/models/order';
import {
  loadUserItemsFromFirestore,
  saveUserItemsToFirestore,
} from 'src/services/firestoreService';

const props = defineProps<{
  selectedMonth: SelectedMonth;
}>();

const emit = defineEmits<{
  'update:userTotal': [total: number];
}>();

const items = ref<UserItem[]>([]);
const isLoading = ref(false);

const yyyymm = computed(
  () => `${props.selectedMonth.year}${String(props.selectedMonth.month).padStart(2, '0')}`,
);

const userTotal = computed(() => items.value.reduce((sum, item) => sum + item.price, 0));
watch(userTotal, (val) => emit('update:userTotal', val), { immediate: true });

function formatDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

// ─── 로드 ─────────────────────────────────────────
async function loadItems() {
  isLoading.value = true;
  try {
    items.value = await loadUserItemsFromFirestore(yyyymm.value);
  } finally {
    isLoading.value = false;
  }
}

watch(yyyymm, loadItems, { immediate: true });

// ─── 입력 상태 ────────────────────────────────────
const inputName = ref('');
const inputPrice = ref<number | null>(null);

// ─── 추가 ─────────────────────────────────────────
async function addItem() {
  if (!inputName.value || !inputPrice.value) return;
  const now = new Date();
  const createdAt = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const newItem: UserItem = {
    id: `user-${Date.now()}`,
    name: inputName.value,
    price: inputPrice.value,
    createdAt,
  };
  items.value = [...items.value, newItem];
  inputName.value = '';
  inputPrice.value = null;
  await saveUserItemsToFirestore(yyyymm.value, items.value);
}

// ─── 삭제 ─────────────────────────────────────────
async function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id);
  await saveUserItemsToFirestore(yyyymm.value, items.value);
}
</script>
