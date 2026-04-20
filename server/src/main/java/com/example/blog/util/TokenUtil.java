package com.example.blog.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.example.blog.po.User;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.interfaces.DecodedJWT;
import lombok.Getter;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Date;

@Component // 添加 @Component，让 Spring 管理这个类
public class TokenUtil {

    // 变量不再直接设为 static，先用实例变量接收 @Value 注入的值
    @Value("${TOKEN_SECRET}")
    private String tokenSecretConfig;

    @Value("${JWT_ISSUER:auth0}")
    private String jwtIssuerConfig;

    @Value("${JWT_EXPIRE_TIME:604800000}") // 默认值建议直接写毫秒数，或者稍后处理转换
    private String jwtExpireTimeConfig;

    // 定义实际的静态变量供 static 方法使用
    private static String TOKEN_SECRET;
    private static String JWT_ISSUER;
    private static long JWT_EXPIRE_TIME;

    private static final Log log = LogFactory.getLog(TokenUtil.class);

    // 4. 使用 @PostConstruct，在依赖注入完成后执行，将实例变量的值赋给静态变量
    @PostConstruct
    public void init() {
        TOKEN_SECRET = this.tokenSecretConfig.trim();
        JWT_ISSUER = this.jwtIssuerConfig.trim();
        JWT_EXPIRE_TIME = Long.parseLong(this.jwtExpireTimeConfig.trim());
    }

    /**
     * 签名生成
     */
    @Getter
    public static class TokenInfo {
        private final String token;
        private final Date expireTime;

        public TokenInfo(String token, Date expireTime) {
            this.token = token;
            this.expireTime = expireTime;
        }
    }

    public static TokenInfo sign(User user) {
        try {
            // 使用静态变量
            Date expiresAt = new Date(System.currentTimeMillis() + JWT_EXPIRE_TIME);
            String token = JWT.create()
                    .withIssuer(JWT_ISSUER)
                    .withClaim("userId", user.getId().toString())
                    .withClaim("userType", user.getType())
                    .withExpiresAt(expiresAt)
                    // 使用HMAC256加密算法
                    .sign(Algorithm.HMAC256(TOKEN_SECRET));

            return new TokenInfo(token, expiresAt);
        } catch (Exception e) {
            log.error("生成Token失败", e);
            return null;
        }
    }

    /**
     * 签名验证
     */
    public static boolean verify(String token){
        try {
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(TOKEN_SECRET)).withIssuer(JWT_ISSUER).build();
            DecodedJWT jwt = verifier.verify(token);
            return true;
        } catch (Exception e){
            return false;
        }
    }

    /**
     * 管理员认证
     */
    public static boolean adminVerify(String token){
        try {
            // 建议：这里也统一使用 JWT_ISSUER 变量，而不是硬编码 "auth0"
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(TOKEN_SECRET)).withIssuer(JWT_ISSUER).build();
            DecodedJWT jwt = verifier.verify(token);
            return "1".equals(jwt.getClaim("userType").asString());
        } catch (Exception e){
            return false;
        }
    }

    /**
     * 获取 token 中的用户 ID
     */
    public static Long getUserId(String token) {
        try {
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(TOKEN_SECRET)).withIssuer(JWT_ISSUER).build();
            DecodedJWT jwt = verifier.verify(token);
            return Long.parseLong(jwt.getClaim("userId").asString());
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 获取 token 中的用户类型
     */
    public static String getUserType(String token) {
        try {
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(TOKEN_SECRET)).withIssuer(JWT_ISSUER).build();
            DecodedJWT jwt = verifier.verify(token);
            return jwt.getClaim("userType").asString();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 验证是否为本人或管理员
     */
    public static boolean verifyAccess(String token, Long targetUserId) {
        try {
            Long currentUserId = getUserId(token);
            String userType = getUserType(token);
            return currentUserId != null && (currentUserId.equals(targetUserId) || "1".equals(userType));
        } catch (Exception e) {
            return false;
        }
    }
}