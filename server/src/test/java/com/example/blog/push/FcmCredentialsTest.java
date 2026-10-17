package com.example.blog.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.Signature;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * FCM 服务账号凭据/JWT 单元测试（不依赖网络）。
 */
class FcmCredentialsTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("解析 PKCS#8 PEM 私钥：字面量 \\n 与真实换行均可")
    void parsePrivateKey() throws Exception {
        KeyPair pair = generateKeyPair();
        String base64 = Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded());

        PrivateKey fromLiteral = FcmCredentials.parsePrivateKey(
                "-----BEGIN PRIVATE KEY-----\\n" + base64 + "\\n-----END PRIVATE KEY-----\\n");
        PrivateKey fromRealLines = FcmCredentials.parsePrivateKey(
                "-----BEGIN PRIVATE KEY-----\n" + base64 + "\n-----END PRIVATE KEY-----\n");

        assertNotNull(fromLiteral);
        assertNotNull(fromRealLines);
        assertEquals(pair.getPrivate(), fromLiteral);
        assertEquals(pair.getPrivate(), fromRealLines);
    }

    @Test
    @DisplayName("构造 RS256 JWT：header/claims 正确且签名可被公钥验证")
    void buildJwt() throws Exception {
        KeyPair pair = generateKeyPair();
        String clientEmail = "firebase-adminsdk@example.iam.gserviceaccount.com";
        String tokenUri = "https://oauth2.googleapis.com/token";

        String jwt = FcmCredentials.buildJwt(clientEmail, tokenUri, pair.getPrivate(), mapper);
        String[] parts = jwt.split("\\.");
        assertEquals(3, parts.length, "JWT 应为三段");

        JsonNode header = mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
        assertEquals("RS256", header.path("alg").asText());
        assertEquals("JWT", header.path("typ").asText());

        JsonNode claims = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
        assertEquals(clientEmail, claims.path("iss").asText());
        assertEquals(tokenUri, claims.path("aud").asText());
        assertEquals("https://www.googleapis.com/auth/firebase.messaging", claims.path("scope").asText());
        assertTrue(claims.path("exp").asLong() > claims.path("iat").asLong(), "exp 应晚于 iat");

        // 用对应公钥验证签名
        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(pair.getPublic());
        verifier.update((parts[0] + "." + parts[1]).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertTrue(verifier.verify(Base64.getUrlDecoder().decode(parts[2])), "签名应可验证");
    }

    private static KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }
}
