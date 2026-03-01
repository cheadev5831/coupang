<template>
  <div class="card-base section-gap">
    <!-- 접힌 상태: 쿠키 설정됨 -->
    <div v-if="!expanded && cookieState.isSet" class="cookie-panel__row">
      <q-icon
        name="lock"
        color="positive"
        size="18px"
        class="cookie-panel__icon"
      />
      <div class="cookie-panel__status cookie-panel__status--set">
        쿠키 설정됨
        <span class="cookie-panel__saved-at">{{ cookieState.savedAt }} 저장</span>
      </div>
      <q-btn
        flat
        dense
        size="sm"
        label="변경"
        color="grey-7"
        no-caps
        @click="expanded = true"
      />
      <q-btn
        flat
        dense
        size="sm"
        label="초기화"
        color="negative"
        no-caps
        @click="handleClear"
      />
    </div>

    <!-- 접힌 상태: 미설정 -->
    <div v-else-if="!expanded && !cookieState.isSet" class="cookie-panel__row">
      <q-icon name="lock_open" color="negative" size="18px" class="cookie-panel__icon" />
      <div class="cookie-panel__status cookie-panel__status--unset">쿠키 미설정</div>
      <q-btn flat dense size="sm" label="입력" color="primary" no-caps @click="expanded = true" />
    </div>

    <!-- 펼친 상태: 미설정 상단 표시 -->
    <div v-if="expanded && !cookieState.isSet" class="cookie-panel__row">
      <q-icon name="lock_open" color="negative" size="18px" class="cookie-panel__icon" />
      <div class="cookie-panel__status cookie-panel__status--unset">쿠키 미설정 — 입력해 주세요</div>
    </div>

    <!-- 입력 폼 -->
    <div v-if="expanded" class="cookie-panel__form">
      <q-input
        v-model="cookieInput"
        type="textarea"
        label="쿠팡 세션 쿠키"
        hint="개발자 도구 > Network 탭 > 요청 헤더의 Cookie 값 전체를 붙여넣어 주세요"
        :rows="3"
        outlined
        dense
        autogrow
        clearable
        bg-color="white"
      />
      <div class="cookie-panel__actions">
        <q-btn
          flat
          dense
          label="취소"
          color="grey-6"
          no-caps
          @click="handleCancel"
        />
        <q-btn
          unelevated
          dense
          label="저장"
          color="primary"
          no-caps
          :disable="!cookieInput.trim()"
          @click="handleSave"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import 'src/css/cookie-panel.css';
import type { CookieState } from 'src/data/default';

const props = defineProps<{
  cookieState: CookieState;
}>();

const emit = defineEmits<{
  save: [value: string];
  clear: [];
}>();

const expanded = ref(!props.cookieState.isSet);
const cookieInput = ref('');

watch(
  () => props.cookieState.isSet,
  (isSet) => {
    if (!isSet) expanded.value = true;
  },
);

function handleSave() {
  if (!cookieInput.value.trim()) return;
  emit('save', cookieInput.value.trim());
  cookieInput.value = '';
  expanded.value = false;
}

function handleClear() {
  emit('clear');
  cookieInput.value = '';
  expanded.value = true;
}

function handleCancel() {
  cookieInput.value = '';
  expanded.value = false;
}
</script>
