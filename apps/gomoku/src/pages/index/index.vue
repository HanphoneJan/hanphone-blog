<template>
  <view class="index-container">
    <view class="header">
      <text class="title">五子棋</text>
      <text class="subtitle">传统棋艺 · 智慧对决</text>
    </view>
    
    <view class="mode-selection">
      <view 
        class="mode-card" 
        @click="navigateTo('aigomoku')"
      >
        <view class="mode-icon">
          <view class="stone black"></view>
          <text class="vs-text">VS</text>
          <view class="computer-icon">💻</view>
        </view>
        <text class="mode-title">人机对战</text>
        <text class="mode-desc">与AI一较高下</text>
      </view>
      
      <view 
        class="mode-card" 
        @click="navigateTo('gomoku')"
      >
        <view class="mode-icon">
          <view class="stone black"></view>
          <text class="vs-text">VS</text>
          <view class="stone white"></view>
        </view>
        <text class="mode-title">本地对战</text>
        <text class="mode-desc">双人同屏竞技</text>
      </view>
    </view>
    
    <view class="footer">
      <text class="footer-text">传统五子棋 · 黑白对决</text>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    navigateTo(page) {
      uni.navigateTo({
        url: `/pages/${page}/${page}`
      });
    }
  }
};
</script>

<style>
.index-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100vh;
  padding: 40px 20px;
  background-color: #f5f5dc;
  font-family: 'SimSun', serif;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.title {
  font-size: 36px;
  color: #8b4513;
  font-weight: bold;
  letter-spacing: 4px;
}

.subtitle {
  font-size: 16px;
  color: #8b4513;
  margin-top: 8px;
  display: block;
}

.mode-selection {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
  gap: 30px;
}

.mode-card {
  background-color: #e6d8b5;
  border: 2px solid #8b4513;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.mode-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mode-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.stone {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
}

.black {
  background-color: #333;
  border: 1px solid #000;
}

.white {
  background-color: #fff;
  border: 1px solid #ddd;
}

.vs-text {
  font-size: 18px;
  color: #8b4513;
  font-weight: bold;
}

.computer-icon {
  font-size: 24px;
}

.mode-title {
  font-size: 22px;
  color: #8b4513;
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
}

.mode-desc {
  font-size: 16px;
  color: #8b4513;
}

.footer {
  margin-top: 40px;
  text-align: center;
}

.footer-text {
  font-size: 14px;
  color: #8b4513;
  opacity: 0.8;
}

@media (min-width: 768px) {
  .mode-selection {
    flex-direction: row;
    justify-content: center;
  }
  
  .mode-card {
    width: 200px;
  }
  
  .title {
    font-size: 42px;
  }
  
  .subtitle {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .index-container {
    padding: 30px 15px;
  }

  .header {
    margin-top: 30px;
  }
  
  .title {
    font-size: 32px;
  }
  
  .subtitle {
    font-size: 14px;
  }
  
  .mode-card {
    padding: 20px;
  }
  
  .mode-title {
    font-size: 20px;
  }
  
  .mode-desc {
    font-size: 14px;
  }
  
  .stone {
    width: 25px;
    height: 25px;
  }
  
  .computer-icon {
    font-size: 20px;
  }

  .footer{
    margin-bottom: 20px;
  }
}
</style>