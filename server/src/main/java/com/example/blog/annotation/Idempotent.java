package com.example.blog.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 声明写接口使用客户端提供的幂等键（X-Request-Id）去重，支持任意重试。
 * 首次请求成功后响应会被缓存；重试返回缓存结果，避免重复创建。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {

    /**
     * 幂等键缓存时长（秒），默认 1 天。
     */
    long ttlSeconds() default 86400L;
}