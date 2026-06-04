<?php
require_once 'token.php';

function interceptRequest() {
    $admin_path = '/admin/'; // 需要拦截的路径前缀
    $current_path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);  // 获取请求的路径，不包含查询参数

    // 检查当前路径是否以 /admin/ 开头
    if (strpos($current_path, $admin_path) === 0) {
        // 从请求头中获取 Authorization 字段
        $authorization = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';

        // 检查 Authorization 字段是否存在
        if (empty($authorization)) {
            http_response_code(401);
            echo json_encode(array("message" => "未授权的请求"));
            exit;
        }

        // 提取 token
        $token = null;
        if (preg_match('/Bearer\s+(.*)$/i', $authorization, $matches)) {
            $token = $matches[1];
        }

        // 检查 token 是否存在
        if (empty($token)) {
            http_response_code(401);
            echo json_encode(array("message" => "未授权的请求"));
            exit;
        }

        // 验证 token
        $payload = verifyToken($token);
        if ($payload === false) {
            http_response_code(401);
            echo json_encode(array("message" => "无效的 token"));
            exit;
        }
        
        // 如果需要，可以在此处进一步验证权限，比如是否为管理员
        if ($payload['is_admin'] !== true) {
            http_response_code(403);
            echo json_encode(array("message" => "权限不足"));
            exit;
        }
    }
}

?>