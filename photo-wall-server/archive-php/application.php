<?php
require_once 'interceptor/interceptor.php';
//调用拦截器，确保每次请求都经过验证
interceptRequest();

// 允许跨域请求，如果需要跨域，则相关的php文件都需要添加这段代码
header('Access-Control-Allow-Origin: *'); //允许所有域
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');  //允许 POST 和 GET 请求，并处理 OPTIONS
//允许 Content-Type 和 Authorization 头（如有 JWT Token，必须添加）
header('Access-Control-Allow-Headers: Content-Type, Authorization');  
// 处理跨域时的 OPTIONS 预检请求，确保返回 200 OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$request_uri = $_SERVER['REQUEST_URI']; // 获取请求的 URI,这里由于nginx服务器的配置，会包含前缀/application.php
// 路由配置
$routes = [
    '/application.php/login' => './controller/login.php',
    '/application.php/register' => './controller/register.php',
    '/application.php/wechatRegister' => './controller/wechatRegister.php', 
    '/application.php/sendVerificationCode' => './controller/sendVerificationCode.php',
    '/application.php/visitCount' => './controller/visitCount.php',
    '/application.php/show' => './controller/show.php',
    '/application.php/upload' => './controller/upload.php',
    '/application.php/likes' => './controller/likes.php',
    '/application.php/search' => './controller/search.php', 
    '/application.php/forgotPassword' => './controller/forgotPassword.php', 
    '/application.php/getTag' => './controller/getTag.php', 
    '/application.php/admin/adminShow' => './controller/admin/adminShow.php',
    '/application.php/admin/changePhotoType' => './controller/admin/changePhotoType.php',
    '/application.php/admin/deletePhoto' => './controller/admin/deletePhoto.php',
    '/application.php/admin/adminUpdate' => './controller/admin/adminUpdate.php',
    '/application.php/admin/getUser' => './controller/admin/getUser.php',
    '/application.php/admin/deleteUser' => './controller/admin/deleteUser.php', 
    '/application.php/admin/changeUser' => './controller/admin/changeUser.php', 
    '/application.php/admin/deleteTag' => './controller/admin/deleteTag.php', 
    '/application.php/admin/createTag' => './controller/admin/createTag.php', 
    '/application.php/admin/getAdminTag'=>'./controller/admin/getAdminTag.php',
    '/application.php/admin/addTag'=>'./controller/admin/addTag.php',
    '/application.php/admin/updateTag'=>'./controller/admin/updateTag.php',
    '/application.php/admin/deletePhotoTag'=>'./controller/admin/deletePhotoTag.php', 
];
if (array_key_exists($request_uri, $routes)) {
    require_once $routes[$request_uri];  // 根据请求的 URI 调用对应的控制器
} else {
    http_response_code(404);
    echo json_encode(array("message" => "请求的资源不存在"));
}
?>
