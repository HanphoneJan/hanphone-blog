const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// 日志存储目录
const logDir = path.join(__dirname, 'logs');

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // 如果有元数据，格式化输出
    if (Object.keys(meta).length > 0) {
      log += ` | ${JSON.stringify(meta)}`;
    }
    
    // 如果有错误堆栈
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// 控制台输出格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` | ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 错误日志（只记录 error 级别）
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    
    // 警告日志（记录 warn 和 error 级别）
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'warn-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    
    // 应用日志（记录所有级别）
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
    
    // HTTP 请求日志
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// HTTP 请求专用 logger
const httpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  httpLogger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

module.exports = {
  logger,
  httpLogger
};
