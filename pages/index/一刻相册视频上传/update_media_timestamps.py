import os
import time
import win32file
import win32con
import pywintypes

# 定义支持的媒体文件扩展名列表
SUPPORTED_EXTENSIONS = [
    ".mpga", ".wmd", ".wvx", ".wmx", ".wm", ".mpeg", ".swf", ".mpg",
    ".wmv", ".rmvb", ".mpeg4", ".mp4", ".mpeg2", ".flv", ".avi",
    ".mkv", ".f4v", ".mov", ".vob", ".m4v", ".asf", ".ts", ".webm",
    ".pmp", ".mtv", ".amv"
]

# 定义一个函数来修改文件的创建时间
def change_file_creation_time(filename, creation_time):
    handle = win32file.CreateFile(
        filename,
        win32file.GENERIC_WRITE,
        win32file.FILE_SHARE_READ | win32file.FILE_SHARE_WRITE | win32file.FILE_SHARE_DELETE,
        None,
        win32con.OPEN_EXISTING,
        win32file.FILE_ATTRIBUTE_NORMAL,
        None
    )
    win32file.SetFileTime(handle, creation_time, None, None)
    handle.close()

# 主函数
def main():
    while True:  # 开始无限循环
        # 获取用户输入的路径
        path = input("请输入媒体文件所在的文件夹路径 (或输入 'exit' 退出): ")
        if path.lower() == 'exit':  # 检查是否输入了 'exit'
            break  # 如果是，则退出循环

        if not os.path.exists(path):
            print("路径不存在，请重新输入。")
            continue  # 如果路径不存在，则重新开始循环

        # 获取当前系统时间
        current_time = time.time()
        # 转换为时间结构
        time_struct = time.localtime(current_time)
        # 格式化时间为字符串
        formatted_time = time.strftime('%Y%m%d%H%M%S', time_struct)
        # 创建 Windows 时间格式
        win_time = pywintypes.Time(time.mktime(time_struct))

        # 获取用户指定路径下的所有文件
        files = os.listdir(path)

        # 筛选出支持的媒体文件
        media_files = [f for f in files if os.path.isfile(os.path.join(path, f)) and f.lower().endswith(tuple(SUPPORTED_EXTENSIONS))]

        for filename in media_files:
            full_path = os.path.join(path, filename)
            # 修改文件的创建时间和修改时间
            os.utime(full_path, (current_time, current_time))

            # 修改文件的 Windows 创建时间
            change_file_creation_time(full_path, win_time)

            # 构建新的文件名
            new_filename = f"{os.path.splitext(full_path)[0]}_{formatted_time}{os.path.splitext(full_path)[1]}"

            # 重命名文件
            os.rename(full_path, new_filename)

        print("媒体文件的时间戳和名称已更新。")

# 当脚本直接运行时执行
if __name__ == "__main__":
    main()