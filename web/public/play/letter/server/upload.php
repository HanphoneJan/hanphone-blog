<?php

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require 'db_connect.php';

// 接收客户端发送的JSON数据
$data = json_decode(file_get_contents('php://input'), true);
$name = $data['name'] ?? '';
$response = $data['userResponse'] ?? '';

// 获取数据库连接
$conn = getDbConnection();

if (!empty($name)) {
    // 检查name是否存在
    $checkSql = "SELECT * FROM user WHERE name = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("s", $name);
    $checkStmt->execute();
    $result = $checkStmt->get_result();

    if ($result->num_rows > 0) {
        // 更新对应的response的值
        $sql = "UPDATE user SET response = ? WHERE name = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ss", $response, $name);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            $result = ['status' => 'success', 'message' => 'Response updated successfully'];
        } else {
            $result = ['status' => 'error', 'message' => 'Failed to update response'];
        }
    } else {
        // 插入新的name和response
        $sql = "INSERT INTO user (name,nickname, response,number,content,birthday) VALUES (?, ?,?,0,null,null)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sss", $name,$name, $response);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            $result = ['status' => 'success', 'message' => 'Response added successfully'];
        } else {
            $result = ['status' => 'error', 'message' => 'Failed to add response'];
        }
    }
} else {
    $result = ['status' => 'error', 'message' => 'Name cannot be empty'];
}

// 关闭数据库连接
$conn->close();

// 返回结果
header('Content-Type: application/json');
echo json_encode($result);
?>
