<?php
// 更新图片数据的接口
require_once '/www/server_atlas/config/db_connect.php';

// 设置返回类型为 JSON
header('Content-Type: application/json');

// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);

// 检查是否提供了必要的字段
$author = isset($data['author']) ? $data['author'] : '';
$username = isset($data['username']) ? $data['username'] : '';
$description = isset($data['description']) ? $data['description'] : '';
$title = isset($data['title']) && !empty($data['title']) ? $data['title'] : 'Untitled'; // 默认标题
$type = isset($data['type']) ? $data['type'] : '';
$likes = isset($data['likes']) ? $data['likes'] : 0;


// 检查 id 是否存在并且是有效数字
if (isset($data['id']) ) {
    $id = (string)$data['id'];  

    // 连接数据库
    $conn = getDbConnection();
    if ($conn === false) {
        echo json_encode(array("message" => "无法连接到数据库", "status" => 0));
        exit;
    }

    // 构建动态的 SQL 更新语句
    $update_fields = [];
    $params = [];
    $param_types = '';

    // 动态添加需要更新的字段
    if ($author !== '') {
        $update_fields[] = "author = ?";
        $params[] = $author;
        $param_types .= 's'; // string 类型
    }
    if ($username !== '') {
        $update_fields[] = "username = ?";
        $params[] = $username;
        $param_types .= 's'; // string 类型
    }
    if ($description !== '') {
        $update_fields[] = "description = ?";
        $params[] = $description;
        $param_types .= 's'; // string 类型
    }
    if ($title !== '') {
        $update_fields[] = "title = ?";
        $params[] = $title;
        $param_types .= 's'; // string 类型
    }
    if ($type !== '') {
        $update_fields[] = "type = ?";
        $params[] = $type;
        $param_types .= 'i'; // integer 类型
    }
    if ($likes !== '') {
        $update_fields[] = "likes = ?";
        $params[] = $likes;
        $param_types .= 'i'; // integer 类型
    }

    // 如果没有需要更新的字段，则返回错误
    if (empty($update_fields)) {
        echo json_encode(array("message" => "没有提供要更新的字段", "status" => 0));
        exit;
    }

    // 将动态字段拼接到 SQL 语句中
    $sql = "UPDATE files SET " . implode(", ", $update_fields) . " WHERE id = ?";
    $params[] = $id;  // 绑定 id 参数
    $param_types .= 'i'; // id 是整数类型

    // 使用预处理语句避免 SQL 注入
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        echo json_encode(array("message" => "数据库查询准备失败", "status" => 0));
        exit;
    }

    // 绑定参数
    $stmt->bind_param($param_types, ...$params);

    // 执行查询
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(array("message" => "更新图片数据成功", "status" => 830));
        } else {
            echo json_encode(array("message" => "未找到该图片或没有更改", "status" => 0));
        }
    } else {
        echo json_encode(array("message" => "修改图片数据失败: " . $stmt->error, "status" => 0));
    }

    // 关闭连接
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少或无效的id参数", "status" => 0));
}

exit;
?>
