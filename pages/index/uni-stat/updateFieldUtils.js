// 更新userFieldsMap中特定字段的value属性
function updateUserFieldValue(userFieldsMap, fieldToUpdate, newValue, newContrast) {
    const field = userFieldsMap.find(f => f.field === fieldToUpdate);
    if (field) {
        field.value = newValue; // 更新今日数据值
        if (typeof newContrast !== 'undefined') { // 检查是否提供了contrast值
            field.contrast = newContrast; // 更新昨日数据值
        }
    }
}

export { 
	updateUserFieldValue
};