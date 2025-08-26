/**
 * 工具接口定义
 */

/**
 * 工具接口
 */
export interface Tool {
  /**
   * 工具名称
   */
  name: string;
  
  /**
   * 工具描述
   */
  description: string;
  
  /**
   * 输入模式定义
   */
  input_schema: any;
  
  /**
   * 工具处理函数
   */
  handler: (input: any) => Promise<any>;
  
  /**
   * 是否需要认证
   */
  requires_auth: boolean;
  
  /**
   * 工具类别
   */
  category: string;
}

/**
 * 工具描述接口（用于提供给大模型）
 */
export interface ToolDescription {
  /**
   * 工具名称
   */
  name: string;
  
  /**
   * 工具描述
   */
  description: string;
  
  /**
   * 输入模式定义
   */
  input_schema: any;
}
