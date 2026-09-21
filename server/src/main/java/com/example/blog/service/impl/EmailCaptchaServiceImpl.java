package com.example.blog.service.impl;

import com.example.blog.service.EmailCaptchaService;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.time.Duration;

@Service
public class EmailCaptchaServiceImpl implements EmailCaptchaService {

    private static final Log log = LogFactory.getLog(EmailCaptchaServiceImpl.class);

    private final JavaMailSender javaMailSender;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${spring.mail.from-name}")
    private String fromName;

    @Value("${captcha.rate-limit-seconds:60}")
    private int captchaRateLimitSeconds;

    @Value("${captcha.max-email-length:254}")
    private int maxEmailLength;

    @Value("${captcha.max-attempts:5}")
    private int maxAttempts;

    private static final int CAPTCHA_EXPIRE_MINUTES = 5;
    private static final int CAPTCHA_LENGTH = 6;

    // 验证码尝试次数 key 前缀
    private static final String ATTEMPTS_PREFIX = "captcha:attempts:";

    // 邮箱格式正则
    private static final java.util.regex.Pattern EMAIL_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    // 构造函数依赖校验
    public EmailCaptchaServiceImpl(JavaMailSender javaMailSender, RedisTemplate<String, String> redisTemplate) {
        this.javaMailSender = Objects.requireNonNull(javaMailSender, "javaMailSender must not be null");
        this.redisTemplate = Objects.requireNonNull(redisTemplate, "redisTemplate must not be null");
    }

    @Override
    public Boolean sendCaptcha(String email) {
        return sendCaptcha(email, SCENE_GENERAL);
    }

    @Override
    public Boolean validateCaptcha(String email, String captcha) {
        return validateCaptcha(email, SCENE_GENERAL, captcha);
    }

    @Override
    public Boolean sendCaptcha(String email, String scene) {
        try {
            Objects.requireNonNull(email, "email must not be null");
            Objects.requireNonNull(scene, "scene must not be null");

            // 校验邮箱长度
            if (email.length() > maxEmailLength) {
                log.warn("邮箱地址过长: " + email.length() + " chars");
                return false;
            }

            // 校验邮箱格式
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                log.warn("邮箱格式不合法: " + email);
                return false;
            }

            // Rate Limiting：同一邮箱发送间隔校验
            String rateKey = "captcha:rate:" + scene + ":" + email;
            Boolean canSend = redisTemplate.opsForValue()
                    .setIfAbsent(rateKey, "1", captchaRateLimitSeconds, java.util.concurrent.TimeUnit.SECONDS);
            if (!Boolean.TRUE.equals(canSend)) {
                log.warn("验证码发送频率过快: " + email);
                return false;
            }

            // 校验配置参数
            Objects.requireNonNull(fromEmail, "fromEmail must not be null (check spring.mail.username config)");
            Objects.requireNonNull(fromName, "fromName must not be null (check spring.mail.from-name config)");

            // 生成验证码
            String captcha = generateCaptcha();
            Objects.requireNonNull(captcha, "generated captcha must not be null");

            // 构建邮件消息
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("【" + fromName + "的个人博客】验证码");
            message.setText("您的验证码是：" + captcha + "，有效期" + CAPTCHA_EXPIRE_MINUTES + "分钟，请尽快使用。");

            // 发送邮件
            javaMailSender.send(message);

            // 存储验证码到Redis（按场景隔离，防跨场景复用）
            String redisKey = "captcha:" + scene + ":" + email;
            redisTemplate.opsForValue().set(redisKey, captcha, CAPTCHA_EXPIRE_MINUTES, TimeUnit.MINUTES);
            // 新验证码重置尝试次数，避免历史失败影响新码
            redisTemplate.delete(ATTEMPTS_PREFIX + scene + ":" + email);

            return true;
        } catch (IllegalArgumentException e) {
            log.warn("发送验证码参数错误: " + e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("发送验证码失败", e);
            return false;
        }
    }

    @Override
    public Boolean validateCaptcha(String email, String scene, String captcha) {
        try {
            // 校验输入参数
            Objects.requireNonNull(email, "email must not be null");
            Objects.requireNonNull(scene, "scene must not be null");
            Objects.requireNonNull(captcha, "captcha must not be null");

            String redisKey = "captcha:" + scene + ":" + email;
            String storedCaptcha = redisTemplate.opsForValue().get(redisKey);

            // 验证验证码
            if (captcha.equals(storedCaptcha)) {
                redisTemplate.delete(redisKey);
                redisTemplate.delete(ATTEMPTS_PREFIX + scene + ":" + email);
                return true;
            }

            // 仅当存在验证码时才累计尝试次数，避免为从未发码的邮箱产生无效 Redis 键
            if (storedCaptcha != null) {
                // 尝试次数上限，防止 6 位验证码暴力枚举
                String attemptKey = ATTEMPTS_PREFIX + scene + ":" + email;
                Long attempts = redisTemplate.opsForValue().increment(attemptKey);
                if (attempts != null && attempts == 1) {
                    redisTemplate.expire(attemptKey, Duration.ofMinutes(CAPTCHA_EXPIRE_MINUTES));
                }
                if (attempts != null && attempts >= maxAttempts) {
                    log.warn("验证码尝试次数超限，删除验证码: " + email);
                    redisTemplate.delete(redisKey);
                }
            }
            return false;
        } catch (IllegalArgumentException e) {
            log.warn("验证码验证参数错误: " + e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("验证码验证失败", e);
            return false;
        }
    }

    private String generateCaptcha() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(CAPTCHA_LENGTH);

        for (int i = 0; i < CAPTCHA_LENGTH; i++) {
            sb.append(random.nextInt(10));
        }

        String captcha = sb.toString();
        if (captcha.length() != CAPTCHA_LENGTH) {
            throw new IllegalStateException("generated captcha length incorrect: " + captcha.length());
        }
        return captcha;
    }
}