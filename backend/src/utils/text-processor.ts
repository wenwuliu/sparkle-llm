/**
 * 文本处理工具函数
 */

/**
 * 移除文本中的<think></think>标签及其内容
 * @param text 原始文本
 * @returns 移除标签后的文本
 */
export function removeThinkTags(text: string): string {
  if (!text) return text;

  // 使用正则表达式移除<think>...</think>标签及其内容
  return text.replace(/<think>[\s\S]*?<\/think>/g, '');
}

/**
 * 移除文本中的所有HTML标签
 * @param text 原始文本
 * @returns 移除HTML标签后的文本
 */
export function removeHtmlTags(text: string): string {
  if (!text) return text;

  // 使用正则表达式移除所有HTML标签
  return text.replace(/<[^>]*>/g, '');
}

/**
 * 修复JSON字符串中的特殊字符，使其能够被正确解析
 * @param jsonStr JSON字符串
 * @returns 修复后的JSON字符串
 */
export function fixJsonString(jsonStr: string): string {
  if (!jsonStr) return jsonStr;

  // 处理命令字符串中的特殊字符
  // 在命令字符串中，\; 是shell命令的一部分，但在JSON中会导致解析错误
  // 这里我们在字符串内部查找并修复这些模式
  let fixedStr = jsonStr;

  // 使用正则表达式找到所有的JSON字符串
  const stringRegex = /"(?:[^"\\]|\\.)*"/g;
  fixedStr = fixedStr.replace(stringRegex, (match) => {
    // 对于每个字符串，处理其中的特殊转义序列
    // 将 \; 替换为 \\;（正确的JSON转义）
    return match.replace(/\\;/g, '\\\\;');
  });

  return fixedStr;
}

/**
 * 安全的JSON序列化函数，处理循环引用
 * @param obj 要序列化的对象
 * @param indent 缩进空格数
 * @returns 序列化后的JSON字符串
 */
export function safeStringify(obj: any, indent: number = 2): string {
  try {
    // 创建一个已处理对象的集合
    const seen = new WeakSet();

    return JSON.stringify(obj, (key, value) => {
      // 如果是对象且不为null
      if (typeof value === 'object' && value !== null) {
        // 检查是否已经处理过这个对象（循环引用）
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        // 将对象添加到已处理集合
        seen.add(value);
      }
      return value;
    }, indent);
  } catch (error) {
    console.error('JSON序列化错误:', error);
    return `[无法序列化: ${error.message}]`;
  }
}

/**
 * 从模型响应中提取和解析JSON
 * 使用多种策略尝试从文本中提取和解析JSON
 * @param text 包含可能的JSON的文本
 * @param options 解析选项
 * @returns 解析后的JSON对象，如果解析失败则返回null
 */
export function parseJsonFromModelResponse(text: string, options: {
  logPrefix?: string,  // 日志前缀，用于区分不同来源的日志
  defaultValue?: any,  // 解析失败时的默认返回值
  specificPattern?: RegExp  // 特定的JSON匹配模式
} = {}): any {
  if (!text) {
    return options.defaultValue || null;
  }

  const logPrefix = options.logPrefix ? `[${options.logPrefix}] ` : '';

  // 移除<think>标签，避免JSON解析错误
  const cleanedResponse = removeThinkTags(text);

  if (options.logPrefix) {
    console.log(`${logPrefix}清理后的响应:`, cleanedResponse.substring(0, 200) + (cleanedResponse.length > 200 ? '...' : ''));
  }

  // 解析策略1: 尝试直接解析整个响应
  try {
    const parsedResponse = JSON.parse(cleanedResponse.trim());
    console.log(`${logPrefix}成功直接解析整个响应为JSON`);
    return parsedResponse;
  } catch (e) {
    console.log(`${logPrefix}直接解析失败，尝试使用正则表达式提取JSON`);
  }

  // 解析策略2: 尝试使用特定的正则表达式匹配
  if (options.specificPattern) {
    const specificMatch = cleanedResponse.match(options.specificPattern);
    if (specificMatch) {
      try {
        const jsonStr = specificMatch[0];
        console.log(`${logPrefix}使用特定模式找到JSON:`, jsonStr.substring(0, 100) + (jsonStr.length > 100 ? '...' : ''));

        // 修复JSON字符串中的特殊字符
        const fixedJsonStr = fixJsonString(jsonStr);

        // 解析修复后的JSON
        return JSON.parse(fixedJsonStr);
      } catch (error) {
        console.error(`${logPrefix}使用特定模式解析JSON错误:`, error);
      }
    }
  }

  // 解析策略3: 尝试匹配任何JSON对象
  const jsonRegex = /(\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\})/;
  const jsonMatch = cleanedResponse.match(jsonRegex);

  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[0];
      console.log(`${logPrefix}找到JSON对象:`, jsonStr.substring(0, 100) + (jsonStr.length > 100 ? '...' : ''));

      // 修复JSON字符串中的特殊字符
      const fixedJsonStr = fixJsonString(jsonStr);

      // 解析修复后的JSON
      return JSON.parse(fixedJsonStr);
    } catch (error) {
      console.error(`${logPrefix}解析JSON对象错误:`, error);
    }
  } else {
    console.log(`${logPrefix}未找到任何有效的JSON对象`);
  }

  // 如果所有解析策略都失败，返回默认值
  return options.defaultValue || null;
}

/**
 * 解析工具调用JSON
 * 使用多种策略尝试从文本中提取和解析工具调用JSON
 * 支持两种格式：
 * 1. 传统格式：{ "thoughts": "...", "tool_calls": [...] }
 * 2. OpenAI兼容格式：直接在文本中包含JSON对象，或者使用```json包裹
 * @param text 包含可能的工具调用JSON的文本
 * @returns 解析结果，包含content和toolCalls
 */
export function parseToolCallJson(text: string): { content: string, toolCalls: any[] } {
  if (!text) {
    return { content: text, toolCalls: [] };
  }

  // 首先尝试检测是否有OpenAI兼容的函数调用格式
  // 例如：```json\n{"name": "function_name", "arguments": {...}}\n```
  const openAiFunctionCallPattern = /```(?:json)?\s*\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}\s*```/g;
  let match;
  const toolCalls = [];
  let remainingText = text;

  // 查找所有匹配的函数调用
  while ((match = openAiFunctionCallPattern.exec(text)) !== null) {
    try {
      const functionName = match[1];
      const argumentsJson = match[2];
      const args = JSON.parse(argumentsJson);

      toolCalls.push({
        name: functionName,
        input: args
      });

      // 从文本中移除已处理的函数调用
      remainingText = remainingText.replace(match[0], '');
    } catch (error) {
      console.error('解析OpenAI兼容函数调用格式错误:', error);
    }
  }

  // 如果找到了OpenAI兼容的函数调用，直接返回
  if (toolCalls.length > 0) {
    return {
      content: remainingText.trim(),
      toolCalls
    };
  }

  // 如果没有找到OpenAI兼容的函数调用，尝试传统格式
  // 使用通用的JSON解析函数，指定工具调用特定的模式
  const toolCallsPattern = /\{[\s\S]*?"tool_calls"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/;
  const parsedResponse = parseJsonFromModelResponse(text, {
    logPrefix: 'ToolCall',
    specificPattern: toolCallsPattern
  });

  if (parsedResponse) {
    // 如果有工具调用，返回工具调用结果
    if (parsedResponse.tool_calls && parsedResponse.tool_calls.length > 0) {
      return {
        content: parsedResponse.thoughts || "我需要使用工具来回答这个问题。",
        toolCalls: parsedResponse.tool_calls,
      };
    }

    // 如果有thoughts字段但没有工具调用，只返回thoughts内容
    if (parsedResponse.thoughts && (!parsedResponse.tool_calls || parsedResponse.tool_calls.length === 0)) {
      return {
        content: parsedResponse.thoughts,
        toolCalls: []
      };
    }
  }

  // 如果没有找到工具调用或解析失败，返回原始回答
  return { content: text, toolCalls: [] };
}
