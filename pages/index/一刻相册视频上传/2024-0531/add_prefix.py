import os

def add_prefix_to_files(path, prefix):
    # 获取指定目录下的所有文件和目录列表
    try:
        for filename in os.listdir(path):
            # 构造原始文件的完整路径
            old_file = os.path.join(path, filename)
            # 检查是否为文件
            if os.path.isfile(old_file):
                # 构造新的文件名和完整路径
                new_file = os.path.join(path, f"{prefix}_{filename}")
                # 重命名文件
                os.rename(old_file, new_file)
                print(f"已将 {filename} 重命名为 {prefix}_{filename}")
    except FileNotFoundError:
        print(f"路径 '{path}' 不存在。")
    except Exception as e:
        print(f"发生错误: {e}")

# 重复执行的主循环
while True:
    # 从用户那里获取路径和前缀
    user_path = input("请输入目录路径: ")
    user_prefix = input("请输入要添加的前缀: ")

    # 调用函数以添加前缀
    add_prefix_to_files(user_path, user_prefix)

    # 检查用户是否想要继续
    continue_choice = input("Do you want to add prefixes to more files? (y/n): ").lower()
    if continue_choice != 'y':
        break

print("程序已结束。")