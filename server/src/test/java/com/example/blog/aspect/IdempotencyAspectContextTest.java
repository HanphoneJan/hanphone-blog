package com.example.blog.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

/**
 * 验证 IdempotencyAspect 能被 Spring 容器正常装配。
 * 复用与生产相同的"单构造器 + @Value 注入"，用于捕获启动时 Bean 装配错误
 * （如多构造器导致的 No default constructor found）。
 */
class IdempotencyAspectContextTest {

    @Configuration
    static class TestConfig {

        @Bean
        public RedisTemplate<String, String> redisTemplate() {
            RedisTemplate<String, String> template = new RedisTemplate<>();
            template.setConnectionFactory(mock(RedisConnectionFactory.class));
            return template;
        }

        @Bean
        public ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

    @Test
    void aspectBeanCanBeAutowiredBySpring() {
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext()) {
            ctx.register(IdempotencyAspect.class, TestConfig.class);
            ctx.refresh();
            assertNotNull(ctx.getBean(IdempotencyAspect.class),
                    "IdempotencyAspect 应能被 Spring 通过单构造器自动装配");
        }
    }
}