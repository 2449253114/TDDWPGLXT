const fs = require('fs');
const path = require('path');

function countImagesInSubdirectories(baseDirectoryPath) {
  let result = [];

  try {
    const subdirectories = fs.readdirSync(baseDirectoryPath);

    for (const subdirectory of subdirectories) {
      const subdirectoryPath = path.join(baseDirectoryPath, subdirectory);

      // 排除文本文件
      if (isDirectory(subdirectoryPath)) {
        const imageCount = countImagesInDirectory(subdirectoryPath);
        result.push({
          dir: subdirectory,
          img_count: imageCount
        });
      }
    }

    console.log(`Image count in subdirectories of ${baseDirectoryPath}:`, result);

    // 将结果写入文件
    const resultFilePath = path.join(__dirname, 'result.txt');
    fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));
    console.log(`Results saved to ${resultFilePath}`);
  } catch (error) {
    console.error(`Error reading base directory: ${error.message}`);
  }
}

function countImagesInDirectory(directoryPath) {
  let imageCount = 0;

  try {
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      
      // 排除名为 pic.jpg 的图片
      if (isImageFile(filePath) && file !== 'pic.jpg') {
        imageCount++;
      }
    }

    return imageCount;
  } catch (error) {
    console.error(`Error reading directory: ${error.message}`);
    return 0;
  }
}

function isImageFile(filePath) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']; // 根据需要扩展
  const ext = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(ext);
}

function isDirectory(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

// 用法示例
const baseDirectoryPath = 'C:/Users/24492/Downloads/图片助手(ImageAssistant)_批量图片下载器/www.ubearcn.com';
countImagesInSubdirectories(baseDirectoryPath);



// 使用以下命令在终端中执行 JavaScript 文件：
// node countImages.js