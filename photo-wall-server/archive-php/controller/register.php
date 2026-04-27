<?php
require_once '/www/server_atlas/config/db_connect.php';

// 设置HTTP响应头为JSON
header('Content-Type: application/json');
session_start();//开启session，用于验证码验证
// 获取 POST 请求中的 JSON 数据
$data = json_decode(file_get_contents("php://input"),true);  //为true返回数组，false返回对象
// 检查 JSON 解码是否成功
if ($data === null) {
    echo json_encode(array("status" => 0, "message" => "Invalid JSON format"));
    exit;
}
$username = $data['username'];
$password = $data['password'];
$email = $data['email'];
$code = (int)$data['code'];

//获取Session中存储的验证码，检查验证码是否正确且未过期
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

// 查询用户是否已存在
$sql = "SELECT * FROM user WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode(array("status" => 0, "message" => "用户名已存在"));
    $conn->close();
    exit;
}

// 插入新用户
$hashed_password = password_hash($password, PASSWORD_DEFAULT);
$sql = "INSERT INTO user (username, password, email,is_admin) VALUES (?, ?, ?,0)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sss", $username, $hashed_password, $email);

if ($stmt->execute()) {
    echo json_encode(array("status" => 830, "message" => "注册成功"));
} else {
    echo json_encode(array("status" => 0, "message" => "注册失败: " . $stmt->error));
}

$conn->close();
exit;
?>
