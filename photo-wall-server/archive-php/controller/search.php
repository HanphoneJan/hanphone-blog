<?php
//搜索接口，支持作者和标题的模糊查询
require_once '/www/server_atlas/config/db_connect.php';

//使用post请求.个人觉得get请求中的参数会暴露在url中，不安全
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(array("message" => "仅支持 POST 请求", "status" => 0));
    exit;
}

// 获取 POST 请求体中的数据
$data = json_decode(file_get_contents('php://input'), true);

// 确保查询参数不为空
if (!isset($data['query']) || empty($data['query'])) {
    echo json_encode(array("message" => "查询参数不能为空", "status" => 0, "data" => array()));
    exit;
}
// 获取查询参数,trim() 函数用于去除字符串两端的空格
$query = trim($data['query']); // 获取查询参数

// 连接数据库
$conn = getDbConnection();

if ($conn === false) {
    echo json_encode(array("message" => "无法连接到数据库", "status" => 0));
    exit;
}

// 使用预处理语句避免SQL注入
$stmt = $conn->prepare("SELECT * FROM files WHERE title LIKE ? OR author LIKE ? AND type != 0");
if ($stmt === false) {
    echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
    exit;
}

// 绑定参数
$searchQuery = "%$query%"; // 添加通配符以支持模糊查询
$stmt->bind_param("ss", $searchQuery, $searchQuery);

// 执行查询
if ($stmt->execute()) {
    $result = $stmt->get_result();
    $data = [];

    // 获取匹配的结果
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    // 返回结果
    if (!empty($data)) {
        echo json_encode(array("message" => "查询成功", "status" => 830, "data" => $data));
    } else {
        echo json_encode(array("message" => "未找到匹配的记录", "status" => 0, "data" => []));
    }
} else {
    echo json_encode(array("message" => "查询失败: " . $stmt->error, "status" => 0));
}

// 关闭连接
$stmt->close();  // 关闭预处理语句
$conn->close();  // 关闭数据库连接
?>