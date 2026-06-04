<?php
require_once '/www/server_atlas/config/db_connect.php'; // 引入数据库连接文件

// 设置HTTP响应头为JSON
header('Content-Type: application/json');

// 获取数据库连接对象（MySQLi）
$conn = getDbConnection();

try {
    // 确保连接有效
    if (!$conn) {
        throw new Exception("数据库连接失败：" . mysqli_connect_error());
    }

    // 查询所有标签
    $sql = "SELECT * FROM tag";
    $stmt = $conn->prepare($sql);
    
    if ($stmt === false) {
        throw new Exception("SQL 预处理失败：" . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result) {
        throw new Exception("查询执行失败：" . $stmt->error);
    }

    // 获取查询结果
    $tags = $result->fetch_all(MYSQLI_ASSOC);

    // 关闭 stmt
    $stmt->close();

    // 返回 JSON 格式的数据
    echo json_encode(array('message' => "查询标签成功", "status" => 830, "data" => $tags));

} catch (Exception $e) {
    // 设置 HTTP 状态码 500（内部服务器错误）
    http_response_code(500);
    // 返回错误信息（JSON 格式）
    echo json_encode(array('message' => $e->getMessage(), "status" => 0));
}

// 关闭数据库连接
$conn->close();
exit;
?>
