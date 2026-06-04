<?php
//删除照片的接口
require_once '/www/server_atlas/config/db_connect.php';
require_once '/www/server_atlas/config/config.php';
// 设置返回类型为 JSON
header('Content-Type: application/json');
// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);
$filePath = INTERNAL_PATH;
// 检查id是否存在
if (isset($data['fileId'])) {
    $id = $data['fileId'];

    // 连接数据库
    $conn = getDbConnection();

    // 查找文件路径
    $sql = "SELECT path FROM files WHERE id = $id";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $file_uri = $row['path'];
        $file_name = basename($file_uri);
        // 删除数据库中的记录
        $sql = "DELETE FROM files WHERE id = $id";
        if ($conn->query($sql) === TRUE) {
            // 删除本地文件
            if (unlink($filePath . $file_name)) {

                echo json_encode(array("message" => "文件删除成功", "status" => 830));
            } else {
                echo json_encode(array("message" => "文件删除失败", "status" => 0));
            }
        } else {
            echo json_encode(array("message" => "数据库记录删除失败: " . $conn->error, "status" => 0));
        }
    } else {
        echo json_encode(array("message" => "未找到文件", "status" => 0));
    }

    // 关闭连接
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少id参数", "status" => 0));
}
exit;
?>
