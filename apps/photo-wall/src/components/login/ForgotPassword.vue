<template>
  <div class="brutalist-login">
    <!-- 装饰性几何元素 -->
    <div class="geo-element geo-1"></div>
    <div class="geo-element geo-2"></div>
    <div class="geo-element geo-3"></div>
    <div class="geo-element geo-4"></div>
    
    <!-- 网格背景 -->
    <div class="grid-background"></div>
    
    <div class="brutalist-container">
      <!-- 左侧大标题区域 -->
      <div class="hero-section">
        <div class="hero-content">
          <div class="mega-text">
            <span class="char" v-for="(char, i) in 'PHOTO-WALL'" :key="i" :style="{ animationDelay: `${i * 0.05}s` }">
              {{ char }}
            </span>
          </div>
          <div class="hero-subtitle">
            <span class="bracket">[</span>
            重置密码
            <span class="bracket">]</span>
          </div>
          <div class="hero-divider"></div>
          <p class="hero-desc">
            忘记密码了？别担心，通过邮箱验证即可重置密码。
          </p>
        </div>
        
        <!-- 返回指示器 -->
        <div class="mode-indicator">
          <div class="indicator-line active"></div>
          <span class="mode-text">找回密码</span>
          <div class="indicator-divider"></div>
          <span class="mode-text">FORGOT_PW</span>
          <div class="indicator-line"></div>
        </div>
      </div>

      <!-- 右侧表单区域 -->
      <div class="form-section">
        <div class="form-wrapper">
          <div class="form-panel">
            <div class="panel-header">
              <span class="panel-number">03</span>
              <h3 class="panel-title">// 重置密码</h3>
            </div>
            
            <el-form :model="form" :rules="rules" ref="formRef" class="brutalist-form">
              <div class="input-group">
                <label class="input-label">
                  <span class="label-index">A.</span>
                  邮箱
                </label>
                <div class="input-wrapper">
                  <el-input 
                    v-model="form.email" 
                    autocomplete="off"
                    class="brutalist-input"
                    placeholder="请输入注册邮箱"
                  />
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">
                  <span class="label-index">B.</span>
                  新密码
                </label>
                <div class="input-wrapper">
                  <el-input 
                    v-model="form.password" 
                    type="password" 
                    autocomplete="off"
                    show-password
                    class="brutalist-input"
                    placeholder="设置新密码"
                  />
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">
                  <span class="label-index">C.</span>
                  确认密码
                </label>
                <div class="input-wrapper">
                  <el-input 
                    v-model="form.confirmPassword" 
                    type="password" 
                    autocomplete="off"
                    show-password
                    class="brutalist-input"
                    placeholder="再次输入新密码"
                  />
                </div>
              </div>

              <div class="input-group captcha-group">
                <label class="input-label">
                  <span class="label-index">D.</span>
                  验证码
                </label>
                <div class="captcha-wrapper">
                  <div class="captcha-display">
                    <span class="captcha-text">{{ captchaQuestion }}</span>
                    <span class="captcha-equals">=</span>
                    <span class="captcha-qmark">?</span>
                  </div>
                  <el-input 
                    v-model="form.captcha" 
                    autocomplete="off"
                    class="brutalist-input captcha-input"
                    placeholder="请输入答案"
                  />
                </div>
              </div>

              <div class="input-group code-group">
                <label class="input-label">
                  <span class="label-index">E.</span>
                  邮箱验证码
                </label>
                <div class="code-wrapper">
                  <el-input 
                    v-model="form.emailCode" 
                    autocomplete="off"
                    class="brutalist-input code-input"
                    placeholder="6位数字验证码"
                  />
                  <button 
                    class="brutalist-btn code-btn" 
                    @click.prevent="sendEmailCode"
                    :disabled="isSending"
                  >
                    {{ isSending ? '等待...' : '发送' }}
                  </button>
                </div>
              </div>
            </el-form>

            <div class="action-section dual-actions">
              <button class="brutalist-btn secondary" @click.prevent="resetForm">
                <span class="btn-text">重置表单</span>
                <span class="btn-arrow">↺</span>
              </button>
              <button class="brutalist-btn primary" @click.prevent="handleSubmit">
                <span class="btn-text">提交重置</span>
                <span class="btn-arrow">→</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 返回按钮区域 -->
        <div class="toggle-section">
          <div class="toggle-divider"></div>
          <button class="brutalist-toggle" @click="backLogin">
            <span class="toggle-icon">←</span>
            <span class="toggle-text">返回登录</span>
          </button>
          <div class="toggle-divider"></div>
        </div>
      </div>
    </div>

    <!-- 装饰性角落标记 -->
    <div class="corner-mark tl">+</div>
    <div class="corner-mark tr">+</div>
    <div class="corner-mark bl">+</div>
    <div class="corner-mark br">+</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/store';
import { ENDPOINTS } from '@/api/api';
import api from '@/api/interceptor';

const router = useRouter();
const userStore = useUserStore();

// 监听主题状态变化，同步到 html 元素
watchEffect(() => {
  const htmlClassList = document.documentElement.classList;
  if (userStore.theme === 'dark') {
    htmlClassList.add('dark');
  } else {
    htmlClassList.remove('dark');
  }
});

// 表单数据
const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
  captcha: '',
  emailCode: ''
});

const formRef = ref(null);

// 验证规则
const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (value !== form.value.password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    }, trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ],
  emailCode: [
    { required: true, message: '请输入邮箱验证码', trigger: 'blur' }
  ]
};

// 验证码
const generateCaptcha = () => {
  const num1 = Math.floor(Math.random() * 10) + 10;
  const num2 = Math.floor(Math.random() * 10) + 10;
  const answer = num1 + num2;
  return { question: `${num1} + ${num2}`, answer };
};

const captcha = ref(generateCaptcha());
const captchaQuestion = ref(captcha.value.question);

// 发送验证码
const isSending = ref(false);
const timer = ref(null);

const sendEmailCode = () => {
  if (isSending.value) {
    ElMessage.warning('请稍后再试');
    return;
  }
  isSending.value = true;
  api.post(ENDPOINTS.SENDVERICATIONCODE, { email: form.value.email })
    .then(response => {
      if (response.data.status === 830) {
        ElMessage.success('验证码已发送');
        startTimer();
      } else {
        ElMessage.error('发送验证码失败');
        isSending.value = false;
      }
    })
    .catch(error => {
      ElMessage.error('发送验证码失败');
      console.error('发送验证码出错', error.message);
      isSending.value = false;
    });
};

const startTimer = () => {
  timer.value = setTimeout(() => {
    isSending.value = false;
  }, 60000);
};

// 重置表单
const resetForm = () => {
  form.value = {
    email: '',
    password: '',
    confirmPassword: '',
    captcha: '',
    emailCode: ''
  };
  captcha.value = generateCaptcha();
  captchaQuestion.value = captcha.value.question;
};

// 提交表单
const handleSubmit = () => {
  formRef.value.validate((valid: boolean) => {
    if (valid) {
      if (parseInt(form.value.captcha) !== captcha.value.answer) {
        ElMessage.error('验证码错误');
        captcha.value = generateCaptcha();
        captchaQuestion.value = captcha.value.question;
        return;
      }
      
      api.post(ENDPOINTS.FORGOTPASSWORD, {
        password: form.value.password,
        email: form.value.email,
        code: form.value.emailCode
      }, { withCredentials: true })
      .then(response => {
        if (response.data.status === 830) {
          ElMessage.success('重置密码成功，即将跳转到登录界面');
          setTimeout(() => {
            router.push('/login');
          }, 1500);
        } else {
          ElMessage.error('重置密码失败');
        }
      })
      .catch(error => {
        ElMessage.error('重置密码出错');
        console.error('重置密码失败：', error.message);
      });
    } else {
      ElMessage.error('请正确填写信息');
    }
  });
};

// 返回登录
const backLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
/* CSS Variables for theming */
.brutalist-login {
  --bg-primary: #f5f5f5;
  --bg-secondary: #fff;
  --bg-tertiary: #f5f5f5;
  --text-primary: #0a0a0a;
  --text-secondary: #666;
  --text-muted: #888;
  --text-light: #aaa;
  --border-color: #0a0a0a;
  --input-bg: #f5f5f5;
  --input-placeholder: #999;
  --divider-color: #ddd;
  --shadow-color: #0a0a0a;
  --accent-color: #00b4d8;
  --grid-line: rgba(0,0,0,0.03);
}

/* Dark theme */
html.dark .brutalist-login {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #2a2a2a;
  --text-primary: #f5f5f5;
  --text-secondary: #ccc;
  --text-muted: #888;
  --text-light: #666;
  --border-color: #f5f5f5;
  --input-bg: #2a2a2a;
  --input-placeholder: #666;
  --divider-color: #333;
  --shadow-color: #000;
  --accent-color: #00b4d8;
  --grid-line: rgba(255,255,255,0.05);
}

.brutalist-login {
  min-height: 100vh;
  width: 100vw;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
}

/* 网格背景 */
.grid-background {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
}

/* 装饰性几何元素 */
.geo-element {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.geo-1 {
  width: 200px;
  height: 200px;
  border: 6px solid var(--border-color);
  top: 10%;
  left: 5%;
  transform: rotate(15deg);
  transition: border-color 0.3s ease;
}

.geo-2 {
  width: 0;
  height: 0;
  border-left: 100px solid transparent;
  border-right: 100px solid transparent;
  border-bottom: 170px solid var(--border-color);
  bottom: 15%;
  right: 8%;
  opacity: 0.1;
  transition: border-bottom-color 0.3s ease;
}

.geo-3 {
  width: 80px;
  height: 80px;
  background: var(--accent-color);
  top: 20%;
  right: 15%;
}

.geo-4 {
  width: 150px;
  height: 4px;
  background: var(--border-color);
  bottom: 25%;
  left: 10%;
  transform: rotate(-20deg);
  transition: background 0.3s ease;
}

/* 主容器 */
.brutalist-container {
  width: 90vw;
  max-width: 1200px;
  height: 850px;
  background: var(--bg-secondary);
  border: 6px solid var(--border-color);
  display: flex;
  position: relative;
  z-index: 1;
  box-shadow: 12px 12px 0 var(--shadow-color);
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}

/* 左侧大标题区域 */
.hero-section {
  flex: 1;
  background: #0a0a0a;
  color: #f5f5f5;
  padding: 50px 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 200%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 20px,
    rgba(0,180,216,0.1) 20px,
    rgba(0,180,216,0.1) 40px
  );
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.mega-text {
  font-size: clamp(2.8rem, 7vw, 5rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.05em;
  margin-bottom: 20px;
}

.char {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px);
  animation: charReveal 0.4s ease forwards;
}

@keyframes charReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-subtitle {
  font-size: 1rem;
  letter-spacing: 0.3em;
  color: #888;
  margin-bottom: 20px;
}

.bracket {
  color: var(--accent-color);
}

.hero-divider {
  width: 60px;
  height: 4px;
  background: var(--accent-color);
  margin: 20px 0;
}

.hero-desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #aaa;
  max-width: 300px;
}

/* 模式指示器 */
.mode-indicator {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: auto;
  padding-top: 30px;
}

.indicator-line {
  width: 30px;
  height: 3px;
  background: #333;
  transition: all 0.3s ease;
}

.indicator-line.active {
  width: 60px;
  background: var(--accent-color);
}

.mode-text {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: #666;
}

.indicator-divider {
  width: 1px;
  height: 20px;
  background: #333;
}

/* 右侧表单区域 */
.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  position: relative;
  transition: background 0.3s ease;
  height: 100%;
  overflow: hidden;
}

.form-wrapper {
  flex: 1;
  padding: 40px 50px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.form-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 3px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.panel-number {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-color);
  border: 2px solid var(--accent-color);
  padding: 4px 10px;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.1em;
  transition: color 0.3s ease;
}

/* 表单样式 */
.brutalist-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.15em;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: color 0.3s ease;
}

.label-index {
  color: var(--accent-color);
  font-size: 0.7rem;
}

.input-wrapper {
  position: relative;
}

.input-wrapper::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 0;
  height: 3px;
  background: var(--accent-color);
  transition: width 0.3s ease;
}

.input-wrapper:focus-within::before {
  width: 100%;
}

:deep(.brutalist-input .el-input__wrapper) {
  background: var(--input-bg) !important;
  border: 3px solid var(--border-color) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 12px 16px !important;
  transition: background 0.3s ease, border-color 0.3s ease !important;
}

:deep(.brutalist-input .el-input__inner) {
  font-family: 'Courier New', monospace !important;
  font-size: 0.9rem !important;
  letter-spacing: 0.05em !important;
  color: var(--text-primary) !important;
  transition: color 0.3s ease !important;
}

:deep(.brutalist-input .el-input__inner::placeholder) {
  color: var(--input-placeholder) !important;
  font-size: 0.8rem !important;
  transition: color 0.3s ease !important;
}

:deep(.el-input__suffix-inner) {
  color: var(--text-primary);
  transition: color 0.3s ease;
}

/* 验证码样式 */
.captcha-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
}

.captcha-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #0a0a0a;
  color: #f5f5f5;
  padding: 10px 16px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.captcha-equals {
  color: var(--accent-color);
}

.captcha-qmark {
  color: var(--accent-color);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.captcha-input {
  flex: 1;
}

/* 邮箱验证码 */
.code-wrapper {
  display: flex;
  gap: 10px;
}

.code-input {
  flex: 1;
}

.code-btn {
  padding: 12px 20px !important;
  font-size: 0.75rem !important;
  min-width: 90px;
}

.code-btn:disabled {
  background: #ccc !important;
  cursor: not-allowed;
}

/* 按钮样式 */
.action-section {
  display: flex;
  gap: 12px;
  margin-top: auto;
  padding-top: 15px;
}

.action-section.dual-actions {
  flex-direction: row;
}

.action-section.dual-actions .brutalist-btn {
  flex: 1;
}

.brutalist-btn {
  width: 100%;
  padding: 14px 24px;
  border: 4px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.brutalist-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--border-color);
  transition: left 0.3s ease;
  z-index: 0;
}

.brutalist-btn:hover::before {
  left: 0;
}

.brutalist-btn:hover {
  color: var(--bg-secondary);
}

.brutalist-btn.primary {
  background: var(--border-color);
  color: var(--bg-secondary);
}

.brutalist-btn.primary::before {
  background: var(--accent-color);
}

.brutalist-btn.secondary {
  background: var(--bg-secondary);
  border-width: 4px;
}

.btn-text,
.btn-arrow {
  position: relative;
  z-index: 1;
}

.btn-arrow {
  transition: transform 0.3s ease;
}

.brutalist-btn:hover .btn-arrow {
  transform: translateX(5px);
}

.brutalist-btn.secondary:hover .btn-arrow {
  transform: rotate(-180deg);
}

/* 切换区域 */
.toggle-section {
  display: flex;
  align-items: center;
  padding: 20px 50px;
  background: var(--bg-tertiary);
  border-top: 4px solid var(--border-color);
  gap: 20px;
  transition: background 0.3s ease, border-color 0.3s ease;
}

.toggle-divider {
  flex: 1;
  height: 2px;
  background: var(--border-color);
  transition: background 0.3s ease;
}

.brutalist-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 25px;
  background: var(--bg-secondary);
  border: 3px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.brutalist-toggle:hover {
  background: var(--border-color);
  color: var(--bg-secondary);
}

.toggle-icon {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
  display: inline-block;
}

.brutalist-toggle:hover .toggle-icon {
  transform: translateX(-5px);
}

/* 角落标记 */
.corner-mark {
  position: absolute;
  font-size: 2rem;
  font-weight: 100;
  color: var(--border-color);
  z-index: 2;
  transition: color 0.3s ease;
}

.corner-mark.tl { top: 20px; left: 20px; }
.corner-mark.tr { top: 20px; right: 20px; }
.corner-mark.bl { bottom: 20px; left: 20px; }
.corner-mark.br { bottom: 20px; right: 20px; }

/* 移动端适配 */
@media (max-width: 900px) {
  .brutalist-container {
    flex-direction: column;
    width: 95vw;
    height: auto;
    min-height: auto;
    max-height: none;
    overflow: visible;
  }

  .hero-section {
    padding: 30px;
    min-height: 180px;
    flex: none;
  }

  .mega-text {
    font-size: 2.5rem;
  }

  .hero-desc {
    display: none;
  }

  .form-section {
    height: auto;
    flex: 1;
    min-height: 400px;
  }

  .form-wrapper {
    padding: 25px 30px;
    height: auto;
  }

  .form-panel {
    height: auto;
  }

  .toggle-section {
    padding: 15px 30px;
  }

  .captcha-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .captcha-display {
    justify-content: center;
  }

  .code-wrapper {
    flex-direction: column;
  }

  .action-section.dual-actions {
    flex-direction: column;
  }

  .geo-element {
    display: none;
  }
}

@media (max-width: 480px) {
  .mega-text {
    font-size: 1.8rem;
  }

  .panel-title {
    font-size: 1.1rem;
  }

  .brutalist-btn {
    padding: 12px 20px;
    font-size: 0.75rem;
  }

  .toggle-text {
    display: none;
  }
}

/* Element Plus 深度样式覆盖 */
:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-form-item__error) {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--accent-color);
  padding-top: 5px;
}
</style>
