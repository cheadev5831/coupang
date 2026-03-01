<template>
  <div class="card-base section-gap">
    <!-- 접힌 상태: 설정됨 -->
    <div v-if="!expanded && githubState.isSet" class="github-panel__row">
      <q-icon name="cloud_done" color="positive" size="18px" class="github-panel__icon" />
      <div class="github-panel__status github-panel__status--set">
        GitHub 연동됨
        <span class="github-panel__saved-at">{{ githubState.repo }}</span>
      </div>
      <q-btn flat dense size="sm" label="변경" color="grey-7" no-caps @click="expanded = true" />
      <q-btn flat dense size="sm" label="해제" color="negative" no-caps @click="handleClear" />
    </div>

    <!-- 접힌 상태: 미설정 -->
    <div v-else-if="!expanded && !githubState.isSet" class="github-panel__row">
      <q-icon name="cloud_off" color="grey-5" size="18px" class="github-panel__icon" />
      <div class="github-panel__status github-panel__status--unset">
        GitHub 미연동
        <span class="github-panel__saved-at">설정 시 조회 결과를 자동 저장합니다</span>
      </div>
      <q-btn flat dense size="sm" label="설정" color="primary" no-caps @click="expanded = true" />
    </div>

    <!-- 펼친 상태 -->
    <div v-if="expanded && !githubState.isSet" class="github-panel__row">
      <q-icon name="cloud_off" color="grey-5" size="18px" class="github-panel__icon" />
      <div class="github-panel__status github-panel__status--unset">GitHub 토큰을 입력해 주세요</div>
    </div>

    <div v-if="expanded" class="github-panel__form">
      <q-input
        v-model="tokenInput"
        type="password"
        label="GitHub Personal Access Token"
        hint="repo 권한이 있는 PAT를 입력하세요"
        outlined
        dense
        clearable
        bg-color="white"
      />
      <q-input
        v-model="repoInput"
        label="레포지토리"
        hint="owner/repo 형식 (예: cheadev5831/coupang)"
        outlined
        dense
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
          :disable="!tokenInput.trim() || !repoInput.trim()"
          @click="handleSave"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import 'src/css/github-panel.css';
import type { GithubState } from 'src/data/default';

const props = defineProps<{
  githubState: GithubState;
}>();

const emit = defineEmits<{
  save: [token: string, repo: string];
  clear: [];
}>();

const expanded = ref(!props.githubState.isSet);
const tokenInput = ref('');
const repoInput = ref(props.githubState.repo);

watch(
  () => props.githubState.isSet,
  (isSet) => {
    if (!isSet) expanded.value = true;
  },
);

function handleSave() {
  if (!tokenInput.value.trim() || !repoInput.value.trim()) return;
  emit('save', tokenInput.value.trim(), repoInput.value.trim());
  tokenInput.value = '';
  expanded.value = false;
}

function handleClear() {
  emit('clear');
  tokenInput.value = '';
  repoInput.value = props.githubState.repo;
  expanded.value = true;
}

function handleCancel() {
  tokenInput.value = '';
  expanded.value = false;
}
</script>
