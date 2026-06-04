<?php
//增加标签的接口, 用于给文件添加标签
require_once '/www/server_atlas/config/db_connect.php';
// 设置 HTTP 响应头为 JSON
header('Content-Type: application/json');

// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['tagName']) && isset($data['filesId'])) {
    $name = (string)$data['tagName'];  // 获取标签名称
    $files_id = (string)$data['filesId'];  // 获取文件id

    // 连接数据库
    $conn = getDbConnection();

    if ($conn === false) {
        echo json_encode(array("message" => "无法连接到数据库", "status" => 0));
        exit;
    }

    // 1. 检查 `name` 是否已存在于 `tag` 表中
    $stmt = $conn->prepare("SELECT id FROM tag WHERE name = ?");
    if ($stmt === false) {
        echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
        exit;
    }

    $stmt->bind_param("s", $name);     // 绑定参数
    $stmt->execute();  // 执行查询
    $stmt->store_result();     // 绑定结果

    // 如果 `name` 已存在，获取对应的 `tag_id`
    if ($stmt->num_rows > 0) {
        $stmt->bind_result($tag_id);
        $stmt->fetch();
    } else {
        // 如果 `name` 不存在，插入新标签
        $stmt = $conn->prepare("INSERT INTO tag (name) VALUES (?)");
        if ($stmt === false) {
            echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
            exit;
        }

        $stmt->bind_param("s", $name);
        if ($stmt->execute()) {
            $tag_id = $stmt->insert_id; // 获取新插入的 `tag_id`
        } else {
            echo json_encode(array("message" => "插入标签失败: " . $stmt->error, "status" => 0));
            exit;
        }
    }

    // 2. 将 `files_id` 和 `tag_id` 插入 `files_tag` 表
    $stmt = $conn->prepare("INSERT INTO files_tag (files_id, tag_id) VALUES (?, ?)");
    if ($stmt === false) {
        echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
        exit;
    }
    
    $stmt->bind_param("si", $files_id, $tag_id);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(array("message" => "操作成功", "status" => 830));
        } else {
            echo json_encode(array("message" => "未找到该记录或没有更改", "status" => 0));
        }
    } else {
        echo json_encode(array("message" => "操作失败: " . $stmt->error, "status" => 0));
    }

    // 关闭连接
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少或无效的参数", "status" => 0));
}
?>