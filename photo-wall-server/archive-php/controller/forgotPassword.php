<?php
require_once '/www/server_atlas/config/db_connect.php';

// 设置HTTP响应头为JSON
header('Content-Type: application/json');
session_start(); // 开启session，用于验证码验证

// 获取 POST 请求中的 JSON 数据
$data = json_decode(file_get_contents("php://input"), true);  // 为true返回数组，false返回对象

// 检查 JSON 解码是否成功
if ($data === null) {
    echo json_encode(array("status" => 0, "message" => "Invalid JSON format"));
    exit;
}

$password = $data['password'];
$email = $data['email'];
$code = (int)$data['code'];

// 获取Session中存储的验证码，检查验证码是否正确且未过期
if (!isset($_SESSION['verification_code']) || !isset($_SESSION['verification_code_expiry'])) {
    echo json_encode(array("status" => 0, "message" => "验证码未发送或已过期"));
    exit;
}

if ($code !== $_SESSION['verification_code'] || time() > $_SESSION['verification_code_expiry']) {
    if ($code !== $_SESSION['verification_code']) {
        echo json_encode(array("status" => 0, "message" => "验证码错误"));
    } else {
        echo json_encode(array("status" => 0, "message" => "验证码已过期"));
    }
    exit;
}

// 邮箱格式验证
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(array("status" => 0, "message" => "无效的邮箱格式"));
    exit;
}

// 连接数据库
$conn = getDbConnection();

// 更新用户密码
$hashed_password = password_hash($password, PASSWORD_DEFAULT);
$sql = "UPDATE user SET password = ? WHERE email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $hashed_password, $email);

if ($stmt->execute()) {
    echo json_encode(array("status" => 830, "message" => "重置密码成功"));
} else {
    echo json_encode(array("status" => 0, "message" => "重置密码失败: " . $stmt->error));
}

$conn->close();
exit;
?>