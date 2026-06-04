<?php

// 路由配置
/**
 * 路由配置
 *
 * 根据请求的URI进行不同的处理：
 * - 当URI为'/application.php/get'时，引入并执行get.php文件。
 * - 当URI为'/application.php/upload'时，引入并执行upload.php文件。
 * - 其他情况返回404状态码，并输出JSON格式的错误信息"请求的资源不存在"。
 *
 * @var string $request_uri 请求的URI
 */
$request_uri = $_SERVER['REQUEST_URI'];

switch ($request_uri) {
    case '/application.php/get':
        require_once './get.php';
        break;
    case '/application.php/upload':
        require_once './upload.php';
        break;

    default:
        http_response_code(404);
        echo json_encode(array("message" => "请求的资源不存在"));
        break;
}
?>
