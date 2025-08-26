/**
 * 模型相关工具函数
 */

/**
 * 检查模型是否可用
 * @param modelName 模型名称
 * @param availableModels 可用模型列表
 * @param defaultModel 默认模型名称
 * @returns 可用的模型名称（如果原模型不可用，则返回默认模型）
 */
export function checkModelAvailability(
  modelName: string,
  availableModels: any[],
  defaultModel: string
): string {
  try {
    // 检查模型是否存在于可用模型列表中
    const modelExists = availableModels.some((m: any) => 
      m.name === modelName || m.id === modelName
    );

    if (modelExists) {
      return modelName;
    }

    // 如果模型不存在，记录警告并尝试使用可用模型
    console.warn(`模型 ${modelName} 不存在，尝试使用可用模型`);

    if (availableModels.length > 0) {
      // 使用第一个可用模型
      const firstAvailableModel = availableModels[0].name || availableModels[0].id;
      console.log(`使用可用模型: ${firstAvailableModel}`);
      return firstAvailableModel;
    } else {
      // 如果没有可用模型，使用默认模型
      console.log(`没有可用模型，使用默认模型: ${defaultModel}`);
      return defaultModel;
    }
  } catch (error) {
    console.warn('检查模型可用性失败，使用默认模型:', error);
    return defaultModel;
  }
}

/**
 * 确保使用正确的模型名称格式
 * @param providerType 提供商类型
 * @param modelName 模型名称
 * @param defaultModel 默认模型名称
 * @returns 格式化后的模型名称
 */
export function ensureCorrectModelFormat(
  providerType: string,
  modelName: string,
  defaultModel: string
): string {
  // 如果当前提供商是通义，但模型名称是Ollama格式（包含冒号），则使用默认的通义模型名称
  if (providerType === 'qwen' && modelName.includes(':')) {
    console.log(`当前提供商是通义，但检测到Ollama格式的模型名称: ${modelName}，将使用默认通义模型: ${defaultModel}`);
    return defaultModel;
  }
  
  return modelName;
}

/**
 * 处理API错误
 * @param error 错误对象
 * @param context 错误上下文
 * @param defaultErrorMessage 默认错误消息
 * @returns 格式化的错误对象
 */
export function handleApiError(
  error: any,
  context: string,
  defaultErrorMessage: string = '未知错误'
): { success: boolean; message: string; details?: string } {
  console.error(`${context}错误:`, error);
  
  // 提取错误消息
  let errorMessage = defaultErrorMessage;
  let errorDetails = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    errorMessage = error.message || error.error || defaultErrorMessage;
    errorDetails = JSON.stringify(error, null, 2);
  }
  
  return {
    success: false,
    message: errorMessage,
    details: errorDetails
  };
}
