package com.example.blog.service;

public interface EmailCaptchaService {
    Boolean sendCaptcha(String email);
    Boolean validateCaptcha(String email, String captcha);
}
