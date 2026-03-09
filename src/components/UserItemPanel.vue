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
        :disable="!inputName || !inputPrice"
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
          <q-item-label class="product-item__meta">사용자 추가</q-item-label>
        </q-item-section>

        <!-- 가격 + 삭제 -->
        <q-item-section side>
          <div class="user-item-panel__price-row">
            <span class="product-item__price product-item__price--checked">
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
import { ref } from 'vue';
import 'src/css/user-item-panel.css';

interface UserItem {
  id: string;
  name: string;
  price: number;
}

// ─── 임시 목업 데이터 ─────────────────────────────
const items = ref<UserItem[]>([
  { id: 'user-1', name: '스타벅스 아메리카노 텀블러', price: 29000 },
  { id: 'user-2', name: '편의점 간식 모음', price: 7500 },
]);

// ─── 입력 상태 ────────────────────────────────────
const inputName = ref('');
const inputPrice = ref<number | null>(null);

// ─── 추가 ─────────────────────────────────────────
function addItem() {
  if (!inputName.value || !inputPrice.value) return;
  items.value.push({
    id: `user-${Date.now()}`,
    name: inputName.value,
    price: inputPrice.value,
  });
  inputName.value = '';
  inputPrice.value = null;
}

// ─── 삭제 ─────────────────────────────────────────
function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id);
}
</script>
