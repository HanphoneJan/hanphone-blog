<?php
require_once '/www/server_atlas/config/db_connect.php';
require_once '/www/server_atlas/interceptor/token.php';

// 设置 HTTP 响应头为 JSON
header('Content-Type: application/json');

// 确保 Content-Type 正确
if (strpos($_SERVER['CONTENT_TYPE'], 'application/json') === false) {
    echo json_encode(["status" => 0, "message" => "请求格式错误"]);
    exit;
}
// 获取 POST 请求中的 JSON 数据
$data = json_decode(file_get_contents("php://input"),true);  //第二个参数为true返回数组，false返回对象
$username = $data['username'];
$password = $data['password'];

// 输入验证
if (empty($username) || empty($password)) {
    echo json_encode (array("status" => 0, "message" => "用户名和密码不能为空"));
    exit;
}

$conn = getDbConnection();

// 查询用户
$sql = "SELECT * FROM user WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    //password_verify() 函数用于验证密码是否和散列值匹配。密码无需再次哈希化
    if (password_verify($password, $user['password'])) {
        $token = createToken($user['email'], $user['username'], $user['is_admin']); // 生成 JWT 令牌
        if($user['is_admin'] == 1){
            $is_admin = true;}else{
            $is_admin = false;}  //若类型为1则返回管理员为true，否则为false
        echo json_encode(array(
            "status" => 830,
            "message" => "登录成功",
            "token" => $token,
            "user_id" => $user['email'],
            "username" => $user['username'],
            "is_admin" => $is_admin,
        ));
        
    } else {
        echo json_encode(array("status" => 0, "message" => "登录失败" ));
    }
} else {
    echo json_encode(array("status" => 0, "message" => "登录失败"));
}

$conn->close();
exit;
?>
