package com.example.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 定时任务配置类
 * 启用Spring的定时任务调度功能
 */
@Configuration
@EnableScheduling
public class ScheduleConfig {
    // 定时任务配置类，用于启用 @Scheduled 注解
}
