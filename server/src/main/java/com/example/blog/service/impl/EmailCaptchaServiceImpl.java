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

    private static final int CAPTCHA_EXPIRE_MINUTES = 5;
    private static final int CAPTCHA_LENGTH = 6;

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
        try {
            // 校验输入参数
            Objects.requireNonNull(email, "email must not be null");

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
            String rateKey = "captcha:rate:" + email;
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

            // 存储验证码到Redis
            String redisKey = "captcha:" + email;
            redisTemplate.opsForValue().set(redisKey, captcha, CAPTCHA_EXPIRE_MINUTES, TimeUnit.MINUTES);

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
    public Boolean validateCaptcha(String email, String captcha) {
        try {
            // 校验输入参数
            Objects.requireNonNull(email, "email must not be null");
            Objects.requireNonNull(captcha, "captcha must not be null");

            String redisKey = "captcha:" + email;
            String storedCaptcha = redisTemplate.opsForValue().get(redisKey);

            // 验证验证码
            if (captcha.equals(storedCaptcha)) {
                redisTemplate.delete(redisKey);
                return true;
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