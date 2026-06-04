<template>
  <div id="app">
    <!-- 使用 transition 包裹 router-view，触发路由切换过渡动画 -->
      <router-view></router-view>

  </div>
</template>

<script setup lang="ts">
  // 这里可以根据需要添加逻辑
</script>

<style scoped>
#app {
  font-family: "Noto Serif SC", "Songti SC", SimSun, "STSong", "Times New Roman", serif;
}
</style>
