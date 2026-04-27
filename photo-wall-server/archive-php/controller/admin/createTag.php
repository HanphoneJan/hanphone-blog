<?php
// 创建标签的接口, 如果标签已存在则更新标签名称,不与文件关联
require_once '/www/server_atlas/config/db_connect.php';

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['tag'])) {
    $id = (int) $data['tag']['id'];  // 获取标签id
    $name = (string) $data['tag']['name'];  // 获取标签名称

    // 连接数据库
    $conn = getDbConnection();

    if ($conn === false) {
        echo json_encode(array("message" => "无法连接到数据库", "status" => 0));
        exit;
    }

    // 首先检查是否存在该id的标签
    $stmt = $conn->prepare("SELECT id FROM tag WHERE id = ?");
    if ($stmt === false) {
        echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
        exit;
    }

    $stmt->bind_param("i", $id);
    $stmt->execute();
    $stmt->store_result();

    // 如果记录存在，执行更新
    if ($stmt->num_rows > 0) {
        $stmt->close();

        // 更新标签名称
        $stmt = $conn->prepare("UPDATE tag SET name = ? WHERE id = ?");
        if ($stmt === false) {
            echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
            exit;
        }

        $stmt->bind_param("si", $name, $id);
        if ($stmt->execute()) {
            echo json_encode(array("message" => "更新标签成功", "status" => 830));
        } else {
            echo json_encode(array("message" => "更新失败: " . $stmt->error, "status" => 0));
        }
    } else {
        $stmt->close();

        // 插入新标签
        $stmt = $conn->prepare("INSERT INTO tag (name) VALUES (?)");
        if ($stmt === false) {
            echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
            exit;
        }

        $stmt->bind_param("s", $name);
        if ($stmt->execute()) {
            echo json_encode(array("message" => "新增标签成功", "status" => 830));
        } else {
            echo json_encode(array("message" => "插入失败: " . $stmt->error, "status" => 0));
        }
    }

    // 关闭连接
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少或无效的tag参数", "status" => 0));
}
?>
