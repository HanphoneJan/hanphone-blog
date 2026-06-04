<?php
require 'db_connect.php';
// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');



// 接收客户端发送的JSON数据
$data = json_decode(file_get_contents('php://input'), true);
$name = $data['name'] ?? '';

$birthday = $data['birthday'] ?? '';
$default_content = '祝新年快乐，愿万事顺意！追风赶月莫停留，平芜尽处是春山。新的一年，成为更好的自己！';

// 获取数据库连接
$conn = getDbConnection();

// 查找对应的姓名并验证生日
$response = ['status' => 'error', 'message' => 'Name or birthday is incorrect', 'name' => $name];
$sql = "SELECT * FROM user WHERE name = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $name);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    if ($row['birthday'] === $birthday) {
        // 使用占位符，防止SQL注入
        $response = [
            'status' => 'success',
            'content' => $row['content'],
            'message' => 'User found',
            'name' => $name,
            'nickname' => $row['nickname'],
        ];
        $updateSql = "UPDATE user SET number = number + 1 WHERE name = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param("s", $name);
        $updateStmt->execute();
        // 关闭数据库连接
    $conn->close();

    // 返回结果
    header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
}

// 如果查询不正确则返回数据库中default的content，并将接收到的name和birthday写入数据库中
if ($response['status'] === 'error') {
    $nickname = $name;
    $defaultSql = "SELECT * FROM user WHERE name = 'default'";
    $defaultResult = $conn->query($defaultSql);
    if ($defaultResult->num_rows > 0) {
        $defaultRow = $defaultResult->fetch_assoc();
        $response = ['status' => 'success', 'content' => $defaultRow['content'], 'message' => 'Default', 'name' => $name, 'nickname' => $nickname];
        $updateDefaultSql = "UPDATE user SET number = number + 1 WHERE name = 'default'";
        $conn->query($updateDefaultSql);
    }
    $insertSql = "INSERT INTO user (name, nickname, birthday, number, content, response) VALUES (?, ?, ?, 0, ?, NULL)";
    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->bind_param("ssss", $name, $nickname, $birthday, $default_content);
    $insertStmt->execute();
}

// 关闭数据库连接
$conn->close();

// 返回结果
header('Content-Type: application/json');
echo json_encode($response);
?>
