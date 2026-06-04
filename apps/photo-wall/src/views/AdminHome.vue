<!-- 管理员界面框架 -->
<template>
  <div>
    <NavBar />
  </div>
  <el-main>
    <router-view></router-view>
  </el-main>
</template>

<script setup lang="ts">
import NavBar from '@/components/layout/NavBar.vue';
import { onMounted } from 'vue';
onMounted(() => {
  console.log('管理员界面挂载');
});
</script>