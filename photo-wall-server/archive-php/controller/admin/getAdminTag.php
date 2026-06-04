<?php
// 获取标签列表的接口, 返回标签的 ID, 名称和文件数量，用于后台管理页面
// 使用 getDbConnection 函数获取数据库连接
require_once '/www/server_atlas/config/db_connect.php';

// 设置返回类型为 JSON
header('Content-Type: application/json');

$conn = getDbConnection();

// 使用 LEFT JOIN进行查询 并确保 number 为 0 时也返回
// COALESCE 函数用于处理 NULL 值，如果 COUNT(files_tag.tag_id) 为 NULL，则返回 0
$sql = "SELECT tag.id AS tag_id, 
               COALESCE(COUNT(files_tag.tag_id), 0) AS number, 
               tag.name 
        FROM tag 
        LEFT JOIN files_tag ON files_tag.tag_id = tag.id 
        GROUP BY tag.id";

$result = $conn->query($sql);

// 检查查询是否成功
if (!$result) {
    // 如果查询失败，返回错误信息
    echo json_encode(array("message" => "查询失败", "status" => 0, "data" => array()));
    exit;
}

if ($result->num_rows > 0) {
    $data = array();
    while ($row = $result->fetch_assoc()) {
        $data[] = array(
            "id" => $row['tag_id'],
            "number" => (int) $row['number'],
            "name" => $row['name']
        );
    }
    echo json_encode(array("message" => "查询成功", "status" => 830, "data" => $data));
} else {
    echo json_encode(array("message" => "没有数据", "status" => 830, "data" => array()));
}

$conn->close();
exit;
?>
