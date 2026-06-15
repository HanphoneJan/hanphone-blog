package com.example.blog.service.impl;

import com.example.blog.po.User;
import com.example.blog.service.AlertService;
import com.example.blog.service.UserService;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class AlertServiceImpl implements AlertService {

    private static final Log log = LogFactory.getLog(AlertServiceImpl.class);

    private final JavaMailSender javaMailSender;
    private final UserService userService;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${spring.mail.from-name}")
    private String fromName;

    @Value("${alert.rate-limit-hours:6}")
    private int rateLimitHours;

    public AlertServiceImpl(JavaMailSender javaMailSender,
                            UserService userService,
                            RedisTemplate<String, String> redisTemplate) {
        this.javaMailSender = Objects.requireNonNull(javaMailSender, "javaMailSender must not be null");
        this.userService = Objects.requireNonNull(userService, "userService must not be null");
        this.redisTemplate = Objects.requireNonNull(redisTemplate, "redisTemplate must not be null");
    }

    @Override
    public Boolean sendAlertToAdmins(String subject, String content) {
        try {
            Objects.requireNonNull(subject, "subject must not be null");
            Objects.requireNonNull(content, "content must not be null");
            Objects.requireNonNull(fromEmail, "fromEmail must not be null (check spring.mail.username config)");
            Objects.requireNonNull(fromName, "fromName must not be null (check spring.mail.from-name config)");

            // 按天做简单的频次限制，避免邮件轰炸
            String rateKey = "alert:admin:" + LocalDate.now();
            Boolean canSend = redisTemplate.opsForValue()
                    .setIfAbsent(rateKey, "1", rateLimitHours, TimeUnit.HOURS);
            if (!Boolean.TRUE.equals(canSend)) {
                log.warn("管理员告警邮件触发过于频繁，已跳过: " + subject);
                return false;
            }

            List<User> admins = userService.listUser().stream()
                    .filter(u -> "1".equals(u.getType()))
                    .collect(Collectors.toList());

            if (admins.isEmpty()) {
                log.warn("未找到管理员用户，无法发送告警邮件");
                return false;
            }

            String[] toEmails = admins.stream()
                    .map(User::getEmail)
                    .filter(Objects::nonNull)
                    .filter(email -> !email.isBlank())
                    .distinct()
                    .toArray(String[]::new);

            if (toEmails.length == 0) {
                log.warn("管理员用户未配置邮箱，无法发送告警邮件");
                return false;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmails);
            message.setSubject("【" + fromName + "】" + subject);
            message.setText(content);

            javaMailSender.send(message);
            log.info("已发送管理员告警邮件: " + subject + ", 收件人: " + String.join(",", toEmails));
            return true;
        } catch (IllegalArgumentException e) {
            log.warn("发送告警邮件参数错误: " + e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("发送管理员告警邮件失败", e);
            return false;
        }
    }
}
