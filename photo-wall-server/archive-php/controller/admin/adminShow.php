<?php
// 显示所有文件的接口，管理员界面使用
// 使用 getDbConnection 函数获取数据库连接
require_once '/www/server_atlas/config/db_connect.php';

// 设置返回类型为 JSON
header('Content-Type: application/json');
$conn = getDbConnection();

// 查询 files 表中的所有数据
$sql = "SELECT * FROM files";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $data = array();
    while ($row = $result->fetch_assoc()) {
        // 获取每个文件的 ID
        $file_id = (string)$row['id'];
        
        // 根据文件 ID 查询 files_tag 表，获取相关的 tag_id
        $tags_sql = "SELECT tag_id FROM files_tag WHERE files_id = '$file_id'";
        $tags_result = $conn->query($tags_sql);

        $tags = array();
        if ( $tags_result->num_rows > 0) {
            while ($tag_row = $tags_result->fetch_assoc()) {
                $tag_id = $tag_row['tag_id'];

                // 根据 tag_id 查询 tag 表，获取标签的名称
                $tag_sql = "SELECT name FROM tag WHERE id = '$tag_id'";
                $tag_result = $conn->query($tag_sql);
                
                if ($tag_result->num_rows > 0) {
                    $tag_data = $tag_result->fetch_assoc();
                    $tags[] = array("id" => $tag_id, "name" => $tag_data['name']);
                }
            }
        }

        // 将 tags 信息合并到文件数据中
        $row['tags'] = $tags;

        // 将文件数据添加到返回的数据中
        $data[] = $row;
    }

    echo json_encode(array("message" => "查询成功", "status" => 830, "data" => $data));
} else {
    echo json_encode(array("message" => "没有数据", "status" => 0, "data" => array()));
}

$conn->close();
exit;
?>
