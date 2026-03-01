<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="bg-dark">
      <q-toolbar>
        <q-icon name="shopping_bag" color="secondary" size="20px" class="q-mr-xs" />
        <q-toolbar-title class="app-header__title text-white">
          쿠팡 주문 분석기
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import 'src/css/layout.css';
</script>
