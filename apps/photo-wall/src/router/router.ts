import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../store/store';

// 使用动态导入组件实现路由懒加载，仅在访问时才加载
const Login = () => import('@/components/login/Login.vue');
const Atlas = () => import('@/components/Atlas.vue');
const Welcome = () => import('@/views/Home.vue');
const AdminHome = () => import('@/views/AdminHome.vue');
const AdminUser = () => import('@/components/admin/AdminUser.vue');
const ForgotPassword = () => import('@/components/login/ForgotPassword.vue');
const AdminAtlas = () => import('@/components/admin/AdminAtlas.vue');
const AdminTag = () => import('@/components/admin/AdminTag.vue');
const NotFound = () => import('@/components/NotFound.vue');

// 路由表
const routes = [
  {
    path: '/',
    component: Welcome, //整体框架
    redirect: '/index', // 默认重定向到首页
    children: [
      {
        path: '/index', 
        name: 'Index',
        component: Atlas,
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: Welcome,
  },
  {
    path: '/register',
    name: 'Register',
    component: Login, // 复用 Login 组件
  },
  {
    path: '/forgotpassword',
    name: 'ForgotPassword',
    component: ForgotPassword,
  },
  {
    path: '/blog',
    name: 'Blog',
    component: Atlas,  //  满足语法规则，但不会被渲染
    // 外部重定向，直接跳转到指定 URL
    beforeEnter: () => {
      window.location.href = 'https://hanphone.cn';
    },
  },
  {
    path: '/admin',
    component: AdminHome,  //管理员界面框架
    meta: { requiresAuth: true }, // 标记需要登录权限
    redirect: '/admin/atlas', // 默认重定向到子路由
    children: [
      {
        path: 'atlas',
        name: 'AdminAtlas',
        component: AdminAtlas,
      },
      {
        path: 'user',
        name: 'AdminUser',
        component: AdminUser,
      },
      {
        path: 'tag',
        name: 'AdminTag',
        component: AdminTag,
      }
    ],
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*', // 任意路径
    component: NotFound,
  }
];

const router = createRouter({
  history: createWebHistory('/atlas/'), // 部署到域名的子路径
  routes,  // 路由表
});

// 全局路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  // 检查是否需要登录权限（管理后台）
  if (to.path.startsWith('/admin')) {
    if (userStore.isLoggedIn) {
      next(); // 已登录，允许访问（权限控制由组件内部处理）
    } else {
      next({ name: 'Login' }); // 未登录，重定向到登录页
    }
  } else {
    next(); // 非管理路由，直接放行
  }
});

export default router;