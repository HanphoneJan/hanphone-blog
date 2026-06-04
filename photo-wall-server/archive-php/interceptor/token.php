<?php
require_once __DIR__ . '/../config/config.php';

/**
 * 创建JWT令牌
 *
 * @param int $user_id 用户ID
 * @param string $username 用户名
 * @param bool $is_admin 是否为管理员
 * @return string JWT令牌字符串
 *
 * 该函数用于生成JWT令牌，包含用户ID、用户名和管理员状态信息。
 * 令牌有效期为1小时。
 * 使用HS256算法和密钥进行签名。
 */
function createToken($user_email, $username, $is_admin) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'iss' => JWT_ISSUER,
        'aud' => JWT_AUDIENCE,
        'iat' => time(),
        'nbf' => time() +1 * 10, // 10秒后生效
        'exp' => time() + 36000, // 10小时后过期
        'data' => [
            'id' => $user_email,  // 使用用户邮箱作为数据
            'username' => $username, // 使用用户名作为数据
            'is_admin' => $is_admin,
        ]
    ]);
    // 使用HS256算法和密钥进行签名
    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, SECRET_KEY, true);
    $base64UrlSignature = base64UrlEncode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}


/**
 * 验证JWT令牌
 *
 * @param string $token JWT令牌字符串
 * @return array|bool 解码后的令牌数据，如果验证失败则返回false
 *
 * 该函数用于验证JWT令牌的有效性和完整性。
 * 如果令牌有效且未过期，返回解码后的令牌数据。
 * 如果令牌无效或已过期，返回false。
 */
function verifyToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

    $header = json_decode(base64_decode($base64UrlHeader), true);
    $payload = json_decode(base64_decode($base64UrlPayload), true);
    $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $base64UrlSignature));

    $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, SECRET_KEY, true);

    if ($signature !== $expectedSignature) {
        return false;
    }

    if ($payload['exp'] < time()) {
        return false;
    }
    // 可选：验证签发者和受众
    if (($payload['iss'] ?? null) !== JWT_ISSUER) {
        return false;
    }
    if (($payload['aud'] ?? null) !== JWT_AUDIENCE) {
        return false;
    }


    // 返回解码后的令牌数据
    return $payload;
    // 例如，解码后的数据格式如下：
    // {
    //     "user_id": 12345,
    //     "username": "exampleUser",
    //     "is_admin": true,
    //     "iat": 1698765432,  // 令牌签发时间 (Unix 时间戳)
    //     "exp": 1698769032   // 令牌过期时间 (Unix 时间戳)
    // }
}


/**
 * Base64 URL 编码
 *
 * @param string $data 数据
 * @return string 编码后的字符串
 */
function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}
?>
