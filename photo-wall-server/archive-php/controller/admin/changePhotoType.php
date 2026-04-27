<?php
//更改照片类型的接口，用于审核照片,将照片类型更改为非0值则审核通过
require_once '/www/server_atlas/config/db_connect.php';
header('Content-Type: application/json');
// 获取请求中的数据
$data = json_decode(file_get_contents('php://input'), true);

// 检查id和type是否存在以及它们的类型是否正确
if (isset($data['photo']['id'])  && isset($data['photo']['type']) && is_string($data['photo']['type'])) {
        // 连接数据库
        $conn = getDbConnection();
    $id = $data['photo']['id']; // 强制转换为整数，防止SQL注入
    $type = $conn->real_escape_string($data['photo']['type']); // 使用real_escape_string防止SQL注入（但最好使用预处理语句）



    // 使用预处理语句更新type值
    $stmt = $conn->prepare("UPDATE files SET `type` = ? WHERE id = ?");
    $stmt->bind_param("si", $type, $id); // "s"表示字符串，"i"表示整数

    if ($stmt->execute() === TRUE) {
        echo json_encode(array("message" => "类型更新成功", "status" => 830));
    } else {
        echo json_encode(array("message" => "类型更新失败: " . $stmt->error, "status" => 0));
    }

    // 关闭预处理语句和连接
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(array("message" => "缺少id或type参数，或者参数类型不正确", "status" => 0));
}
exit;
?>   