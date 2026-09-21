package com.example.blog.service;

public interface EmailCaptchaService {

    String SCENE_GENERAL = "general";
    String SCENE_REGISTER = "register";

    Boolean sendCaptcha(String email);

    Boolean validateCaptcha(String email, String captcha);

    Boolean sendCaptcha(String email, String scene);

    Boolean validateCaptcha(String email, String scene, String captcha);
}
