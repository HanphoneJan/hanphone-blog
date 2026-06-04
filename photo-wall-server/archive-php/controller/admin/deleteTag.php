<?php
// 删除某个标签
require_once '/www/server_atlas/config/db_connect.php';
require_once '/www/server_atlas/config/config.php';

// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);
// 设置返回类型为 JSON
header('Content-Type: application/json');
// 检查id是否存在
if (isset($data['tagId'])) {
    $id = (int) $data['tagId'];

    // 连接数据库
    $conn = getDbConnection();

    // 启动事务，确保删除操作的原子性
    $conn->begin_transaction();

    try {
        // 删除files_tag表中与tag相关的记录
        $delete_files_tags_sql = "DELETE FROM files_tag WHERE tag_id = ?";
        $stmt = $conn->prepare($delete_files_tags_sql);
        $stmt->bind_param("i", $id); // 参数绑定，防止SQL注入
        if (!$stmt->execute()) {
            throw new Exception("删除 files_tags 表记录失败: " . $stmt->error);
        }
        // 删除tag表中的记录
        $delete_tag_sql = "DELETE FROM tag WHERE id = ?";
        $stmt = $conn->prepare($delete_tag_sql);
        $stmt->bind_param("i", $id); // 参数绑定，防止SQL注入
        if (!$stmt->execute()) {
            throw new Exception("删除 tag 表记录失败: " . $stmt->error);
        }
        // 提交事务
        $conn->commit();

        // 返回成功响应
        echo json_encode(array("message" => "删除成功", "status" => 830));
    } catch (Exception $e) {
        // 回滚事务
        $conn->rollback();

        // 返回错误响应
        echo json_encode(array("message" => "删除失败: " . $e->getMessage(), "status" => 0));
    }

    // 关闭连接
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少id参数", "status" => 0));
}
exit;
?>
