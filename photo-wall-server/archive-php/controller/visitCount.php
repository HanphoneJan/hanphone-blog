<?php
require_once '/www/server_atlas/config/db_connect.php'; // 引入数据库连接文件

// 获取数据库连接对象
$conn = getDbConnection(); 

try {
    // 增加访问计数
    $stmt = $conn->prepare("UPDATE visitCounts SET visitCount = visitCount + 1 WHERE id = 1");
    $stmt->execute();

    // 获取当前访问计数
    $sql = "SELECT visitCount FROM visitCounts WHERE id = 1";
    $result = $conn->query($sql)->fetch_assoc();
    $visitCount = $result['visitCount'];

    // 设置HTTP响应头为JSON
    header('Content-Type: application/json');

    // 输出JSON格式的数据
    echo json_encode(['visitCount' => $visitCount]);

} catch (PDOException $e) {

    // 设置HTTP状态码为500（内部服务器错误）
    http_response_code(500);

    // 输出错误信息（以JSON格式）
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
exit;
?>