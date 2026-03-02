<template>
  <div class="card-base section-gap">
    <!-- 접힌 상태: 토큰 설정됨 -->
    <div v-if="!expanded && gitHubState.isSet" class="github-panel__row">
      <q-icon name="code" color="positive" size="18px" class="github-panel__icon" />
      <div class="github-panel__status github-panel__status--set">
        GitHub 토큰 설정됨
        <span class="github-panel__saved-at">{{ gitHubState.savedAt }} 저장</span>
      </div>
      <q-btn flat dense size="sm" label="변경" color="grey-7" no-caps @click="expanded = true" />
      <q-btn flat dense size="sm" label="초기화" color="negative" no-caps @click="handleClear" />
    </div>

    <!-- 접힌 상태: 미설정 -->
    <div v-else-if="!expanded && !gitHubState.isSet" class="github-panel__row">
      <q-icon name="code_off" color="negative" size="18px" class="github-panel__icon" />
      <div class="github-panel__status github-panel__status--unset">GitHub 토큰 미설정</div>
      <q-btn flat dense size="sm" label="입력" color="primary" no-caps @click="expanded = true" />
    </div>

    <!-- 펼친 상태: 미설정 상단 표시 -->
    <div v-if="expanded && !gitHubState.isSet" class="github-panel__row">
      <q-icon name="code_off" color="negative" size="18px" class="github-panel__icon" />
      <div class="github-panel__status github-panel__status--unset">
        GitHub 토큰 미설정 — 입력해 주세요
      </div>
    </div>

    <!-- 입력 폼 -->
    <div v-if="expanded" class="github-panel__form">
      <q-input
        v-model="tokenInput"
        type="password"
        label="GitHub Personal Access Token"
        hint="Settings > Developer settings > Personal access tokens (Contents: write 권한 필요)"
        outlined
        dense
        clearable
        bg-color="white"
      />
      <div class="github-panel__actions">
        <q-btn flat dense label="취소" color="grey-6" no-caps @click="handleCancel" />
        <q-btn
          unelevated
          dense
          label="저장"
          color="primary"
          no-caps
          :disable="!tokenInput.trim()"
          @click="handleSave"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import 'src/css/github-panel.css';
import type { GitHubState } from 'src/data/default';

const props = defineProps<{
  gitHubState: GitHubState;
}>();

const emit = defineEmits<{
  save: [token: string];
  clear: [];
}>();

const expanded = ref(!props.gitHubState.isSet);
const tokenInput = ref('');

watch(
  () => props.gitHubState.isSet,
  (isSet) => {
    if (!isSet) expanded.value = true;
  },
);

function handleSave() {
  if (!tokenInput.value.trim()) return;
  emit('save', tokenInput.value.trim());
  tokenInput.value = '';
  expanded.value = false;
}

function handleClear() {
  emit('clear');
  tokenInput.value = '';
  expanded.value = true;
}

function handleCancel() {
  tokenInput.value = '';
  expanded.value = false;
}
</script>
