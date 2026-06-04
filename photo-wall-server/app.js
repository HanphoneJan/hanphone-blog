const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session'); // 引入session模块
const { interceptRequest } = require('./middleware/interceptor');

// 路由导入
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

const app = express();


// 中间件 - 先配置session（必须在路由和拦截器之前）
app.use(session({
  secret: process.env.SESSION_SECRET || '123456',// 用于加密session的密钥（生产环境建议用环境变量）
  resave: false, // 即使session未修改也强制保存（建议false）
  saveUninitialized: false, // 不保存未初始化的session（符合隐私政策）
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 生产环境启用（需HTTPS）
    maxAge: 24 * 60 * 60 * 1000, // session有效期（24小时，可选）
    httpOnly: true, // 防止客户端JS访问cookie（安全措施）
    sameSite: 'lax' // 防止CSRF攻击（可选）
  }
}));

// CORS配置
app.use(cors({
  origin: '*', // 生产环境建议指定具体域名而非*
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // 允许跨域请求携带cookie（如果前端需要）
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 处理预检请求
app.options('/', (req, res) => {
  res.status(200).end();
});

// 拦截器应用
app.use(interceptRequest);

// 路由
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ message: '请求的资源不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

// 启动服务器
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`服务器运行在 localhost:${PORT}`);
});

module.exports = app;