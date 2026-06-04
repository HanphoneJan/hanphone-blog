<!-- 404页面，三秒跳转到主页 -->
<template>
    <h2>页面未找到,</h2>
    <h2>即将跳转到主页</h2>
</template>
    
<script setup lang = "ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
// 定时器存储，类型使用 ReturnType<typeof setTimeout>，保证类型正确
let timerId: ReturnType<typeof setTimeout> | undefined = undefined;

onMounted(() => {
  startReadTimeout();
});

/**
 * 启动一个定时器，在 3 秒后自动跳转到主页。
 * @function startReadTimeout
 */
const startReadTimeout = () => {
  timerId = setTimeout(() => {
    console.log('跳转到主页');
    router.push('/');
  }, 3000); // 3秒后自动执行 startRead
};
</script>
    
<style scoped>
/* 组件样式 */
  h2 {
    text-align: center;
    font-size: 3em;
  }
</style>