// 创建任务的函数
function createTask(taskId, sortType, description) {
    return {
        "_id": taskId,
        "task_type": "album-files-update-file-cover",
        "task_details": {
            "album_id": "",
            "cursor": "",
            "has_more": 0,
            "current_page": 0,
            "total_count": 0
        },
        "task_albums": [
            {
                "album_id": "",
                "status": "pending",
                "total_count": 0
            }
        ],
        "task_album_file_total": 0,
		"task_completed_file_count": 0,
        "task_sort": sortType,
        "task_description": description,
        "status": "pending",
        "create_time": Date.now(),
        "updated_time": Date.now()
    };
}

// 使用函数创建两个任务对象
const newTasks = [
    createTask("task-asc-admin-auto-task-auto-update-file-cover", "asc", "按照相册文件数量升序排序"),
    createTask("task-desc-admin-auto-task-auto-update-file-cover", "desc", "按照相册文件数量降序排序")
];

module.exports = {
	newTasks  // 返回创建的任务数组
}