package com.example.blog.service;

/**
 * 告警服务
 */
public interface AlertService {

    /**
     * 向所有管理员发送邮件告警
     *
     * @param subject 邮件主题
     * @param content 邮件正文
     * @return 是否发送成功（被频次限制也会返回 false）
     */
    Boolean sendAlertToAdmins(String subject, String content);
}
