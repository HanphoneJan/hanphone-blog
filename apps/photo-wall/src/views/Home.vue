<template>
  <div>
    <NavBar />
    <!-- 
     * Home.vue 组件的主要内容区域。
     * 该区域包含一个路由视图，用于渲染匹配的子路由组件。
     -->
    <el-main>
      <!-- 路由视图 -->
      <router-view></router-view>
    </el-main>
    <!-- 渐隐渐现过渡效果的段落元素，当 backTopFlag 为真时显示 -->
    <!-- /**
     * 渐变过渡效果的返回顶部按钮。
     * 当 `backTopFlag` 为真时显示该按钮，点击后会滚动到页面顶部。
     * @component
     * @transition fade
     * @event click - 点击按钮时触发，调用 `scollTo(0)` 方法。
     */ -->
    <transition name="fade">
      <p id="back-top" v-if="backTopFlag" @click="scollTo(0)">
        <span><el-icon><ArrowUpBold /></el-icon></span>
      </p>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useUserStore } from '../store/store';
import NavBar from "../components/layout/NavBar.vue";

// 状态管理
const scrollTop = ref(0);
const backTopFlag = ref(false);
const pageName = computed(() => useUserStore().pageName);

// 处理滚动事件
const getScroll = () => {
  scrollTop.value = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
};

// 滚动到顶部
const scollTo = (offset: number) => {
  window.scrollTo({ top: offset, behavior: 'smooth' });
};

// 监听 scrollTop 的变化
watch(scrollTop, (value) => {
  backTopFlag.value = value > 100;
});

// 生命周期钩子：组件挂载时监听滚动事件
onMounted(() => {
  window.addEventListener('scroll', getScroll);
});

// 生命周期钩子：组件销毁时移除滚动事件监听
onBeforeUnmount(() => {
  window.removeEventListener('scroll', getScroll);
});
</script>

<style scoped>
.el-main {
  padding: 0px;
  margin: 0px;
}

/**
 * @description 返回顶部按钮的样式设置，包括位置、大小、背景色和阴影效果。
 * @style
 * - cursor: 指针样式，表示可点击。
 * - height: 按钮高度为50px。
 * - margin: 负边距用于调整按钮位置。
 * - position: 固定定位，始终显示在视口右下角。
 * - background-color: 按钮背景色为白色。
 * - box-shadow: 添加阴影效果，提升视觉层次感。
 * - border-radius: 圆形按钮。
 * - opacity: 设置透明度为0.8。
 * - display: 使用flex布局，居中内容。
 */
/* 返回顶部按钮的圆形背景 */
#back-top span {
  cursor: pointer;
  height: 50px;
  margin: -125px 0 0;
  padding: 0;
  position: fixed;
  right: 50px;
  bottom: 50px;
  width: 50px;
  z-index: 11;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16);
  border-radius: 50%;
  display: flex;
  opacity: 0.8;
  justify-content: center;
  align-items: center;
}
/* 黑暗背景色 */
.dark #back-top span {
  background-color: black;
}

/* Hover 状态 */
#back-top:hover span {
  opacity: 1;
}

.el-icon-arrow-up {
  color: #ccc;
  font-size: 40px;
}

/* 渐隐渐现过渡效果 */
.fade-enter, .fade-leave-to {
  opacity: 0;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 1s;
}
</style>
