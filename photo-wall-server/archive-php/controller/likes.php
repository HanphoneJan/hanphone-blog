<?php
require_once '/www/server_atlas/config/db_connect.php';

// 设置返回类型为 JSON
header('Content-Type: application/json');
// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);

// 检查id是否存在并验证id是数字
if (isset($data['id']) && is_numeric($data['id'])) {
    $id = $data['id'];  // 强制转换为整数，避免其他类型的输入

    // 连接数据库
    $conn = getDbConnection();

    if ($conn === false) {
        echo json_encode(array("message" => "无法连接到数据库", "status" => 0));
        exit;
    }
    // 使用预处理语句避免SQL注入
    $stmt = $conn->prepare("UPDATE files SET `likes` = `likes` + 1 WHERE id = ?");
    if ($stmt === false) {
        echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
        exit;
    }

    // 绑定参数
    $stmt->bind_param("i", $id);
    // 执行查询
    if ($stmt->execute()) {
    // 检查受影响的行数
    if ($stmt->affected_rows > 0) {
        echo json_encode(array("message" => "点赞成功", "status" => 830));
    } else {
        echo json_encode(array("message" => "未找到该记录或没有更改", "status" => 0));
    }
} else {
    echo json_encode(array("message" => "点赞失败: " . $stmt->error, "status" => 0));
}
    
    // 关闭连接
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少或无效的id参数", "status" => 0));
}

?>
