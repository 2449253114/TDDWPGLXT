import os
import time
import subprocess
import win32file
import win32con
import pywintypes

# 定义一个函数来修改文件的创建时间
def change_file_creation_time(filename, creation_time):
    # 打开文件，准备修改时间属性
    handle = win32file.CreateFile(
        filename,
        win32file.GENERIC_WRITE,
        win32file.FILE_SHARE_READ | win32file.FILE_SHARE_WRITE | win32file.FILE_SHARE_DELETE,
        None,
        win32con.OPEN_EXISTING,
        win32file.FILE_ATTRIBUTE_NORMAL,
        None
    )

    # 设置新的创建时间
    win32file.SetFileTime(handle, creation_time, None, None)

    # 关闭文件句柄
    handle.close()

# 获取当前系统时间
current_time = time.time()
# 转换为时间结构
time_struct = time.localtime(current_time)
# 格式化时间为字符串
formatted_time = time.strftime('%Y%m%d%H%M%S', time_struct)
# 创建 Windows 时间格式
win_time = pywintypes.Time(time.mktime(time_struct))

# 获取当前目录下的所有文件
files = os.listdir('.')

# 筛选出后缀为.mp4的媒体文件
media_files = [f for f in files if os.path.isfile(f) and f.lower().endswith('.mp4')]

for filename in media_files:
    # 修改文件的创建时间和修改时间
    os.utime(filename, (current_time, current_time))
    
    # 修改文件的 Windows 创建时间
    change_file_creation_time(filename, win_time)
    
    # 构建新的文件名
    new_filename = f"{os.path.splitext(filename)[0]}_{formatted_time}.mp4"
    
    # 重命名文件
    os.rename(filename, new_filename)

print("媒体文件的时间戳和名称已更新。")