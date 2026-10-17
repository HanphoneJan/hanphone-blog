package com.example.blog.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

/**
 * Google 服务账号凭据处理：解析 PKCS#8 PEM 私钥、构造 RS256 JWT（用于换取 OAuth2 access token）。
 *
 * <p>从 {@link FcmPushService} 抽出，便于单测（不依赖网络）。</p>
 */
final class FcmCredentials {

    static final String FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
    static final String DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

    private FcmCredentials() {
    }

    /** 解析 PKCS#8 PEM 私钥（兼容字面量 {@code \n} 与真实换行） */
    static PrivateKey parsePrivateKey(String pem) throws Exception {
        String normalized = pem.replace("\\n", "\n")
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] der = Base64.getDecoder().decode(normalized);
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    /**
     * 构造 RS256 签名的 JWT：
     * header {@code {"alg":"RS256","typ":"JWT"}}，claims {@code {iss, scope, aud, iat, exp(+3600s)}}。
     */
    static String buildJwt(String clientEmail, String tokenUri, PrivateKey privateKey, ObjectMapper mapper)
            throws Exception {
        long now = System.currentTimeMillis() / 1000;
        ObjectNode header = mapper.createObjectNode();
        header.put("alg", "RS256");
        header.put("typ", "JWT");
        ObjectNode claims = mapper.createObjectNode();
        claims.put("iss", clientEmail);
        claims.put("scope", FCM_SCOPE);
        claims.put("aud", tokenUri);
        claims.put("iat", now);
        claims.put("exp", now + 3600);

        String signingInput = base64Url(mapper.writeValueAsBytes(header)) + "."
                + base64Url(mapper.writeValueAsBytes(claims));
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(privateKey);
        signature.update(signingInput.getBytes(StandardCharsets.UTF_8));
        return signingInput + "." + base64Url(signature.sign());
    }

    static String base64Url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}
