<?php
// 删除照片标签的接口，删除某个照片的某个标签
require_once '/www/server_atlas/config/db_connect.php';
require_once '/www/server_atlas/config/config.php';

// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);
// 设置返回类型为 JSON
header('Content-Type: application/json');
// 检查tag_id和files_id是否存在
if(isset($data['tagId']) && isset($data['filesId'])) {
    $tag_id = (int) $data['tagId'];
    $files_id = (string) $data['filesId']; // 注意：如果files_id也是整数，应将其转换为(int)

    // 连接数据库
    $conn = getDbConnection();

    // 启动事务，确保删除操作的原子性
    $conn->begin_transaction();

    try {
        // 删除files_tag表中与特定tag_id和files_id相关的记录
        // 注意：这里应该同时指定tag_id和files_id作为WHERE子句的条件
        $delete_files_tags_sql = "DELETE FROM files_tag WHERE tag_id = ? AND files_id = ?";
        $stmt = $conn->prepare($delete_files_tags_sql);
        // 应该绑定两个参数，而不是一个
        $stmt->bind_param("is", $tag_id, $files_id); 
        if (!$stmt->execute()) {
            throw new Exception("删除 files_tag 表记录失败: " . $stmt->error);
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
    echo json_encode(array("message" => "缺少tag_id或files_id参数", "status" => 0));
}
exit;
?>