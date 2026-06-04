package com.example.blog.service;

import com.example.blog.po.User;

public interface OAuthProvider {

    /** 构建授权 URL */
    String buildAuthorizationUrl();

    /** 处理授权码回调：交换 token、获取用户信息、匹配或创建用户 */
    User handleCallback(String code);

    /** 处理浏览器端 ID Token 验证（默认不支持） */
    default User handleIdToken(String idToken) {
        throw new UnsupportedOperationException("ID token flow not supported for " + getProviderName());
    }

    /** 提供商名称（github / google） */
    String getProviderName();

    /** 读取用户在此平台的唯一 ID */
    String getProviderId(User user);

    /** 设置用户在此平台的唯一 ID */
    void setProviderId(User user, String id);
}
