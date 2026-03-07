<template>
  <div>
    <!-- 로딩: 스켈레톤 -->
    <div v-if="loading" class="card-base product-list__card">
      <q-item
        v-for="i in 6"
        :key="i"
        class="product-list__skeleton-item"
      >
        <q-item-section avatar>
          <q-skeleton type="QCheckbox" size="20px" />
        </q-item-section>
        <q-item-section>
          <q-skeleton type="text" :width="`${60 + (i % 3) * 15}%`" class="q-mb-xs" />
          <q-skeleton type="text" width="45%" />
        </q-item-section>
        <q-item-section side>
          <q-skeleton type="text" width="62px" />
        </q-item-section>
      </q-item>
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="products.length === 0" class="card-base product-list__empty">
      <q-icon
        :name="hasFetched ? 'receipt_long' : 'manage_search'"
        class="product-list__empty-icon"
      />
      <p class="product-list__empty-title">
        {{ hasFetched ? '주문 내역이 없어요' : '조회해 보세요' }}
      </p>
      <p class="product-list__empty-sub">
        {{ hasFetched ? '해당 월에 주문 내역이 없습니다.' : '연도와 월을 선택한 후 조회 버튼을 눌러 주세요.' }}
      </p>
    </div>

    <!-- 상품 목록 -->
    <div v-else class="card-base product-list__card">
      <q-list separator>
        <q-item
          v-for="row in products"
          :key="row.id"
          clickable
          :class="[
            'product-item',
            checkedIds.has(row.id) ? 'product-item--checked' : '',
          ]"
          @click="emit('toggle', row.id)"
        >
          <!-- 체크박스 -->
          <q-item-section avatar class="product-item__check-section">
            <q-checkbox
              :model-value="checkedIds.has(row.id)"
              color="primary"
              dense
              @click.stop
              @update:model-value="emit('toggle', row.id)"
            />
          </q-item-section>

          <!-- 상품 이미지 -->
          <q-item-section avatar class="product-item__img-section">
            <q-img
              v-if="row.imageUrl"
              :src="row.imageUrl"
              class="product-item__img"
              fit="cover"
              :ratio="1"
            >
              <template #error>
                <div class="product-item__img-placeholder">
                  <q-icon name="broken_image" color="grey-4" size="18px" />
                </div>
              </template>
            </q-img>
            <div v-else class="product-item__img-placeholder">
              <q-icon name="image" color="grey-4" size="18px" />
            </div>
          </q-item-section>

          <!-- 상품명 + 메타 -->
          <q-item-section>
            <q-item-label
              :class="[
                'product-item__name',
                checkedIds.has(row.id) ? 'product-item__name--checked' : '',
              ]"
            >
              {{ row.name }}
            </q-item-label>
            <q-item-label class="product-item__meta">
              {{ row.orderedAt }}&ensp;·&ensp;{{ row.orderId }}
            </q-item-label>
          </q-item-section>

          <!-- 가격 -->
          <q-item-section side>
            <span
              :class="[
                'product-item__price',
                checkedIds.has(row.id) ? 'product-item__price--checked' : '',
              ]"
            >
              {{ row.price.toLocaleString('ko-KR') }}원
            </span>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'src/css/product-list.css';
import type { ProductRow } from 'src/models/order';

defineProps<{
  products: ProductRow[];
  checkedIds: Set<string>;
  loading?: boolean;
  hasFetched?: boolean;
}>();

const emit = defineEmits<{
  toggle: [id: string];
}>();
</script>
