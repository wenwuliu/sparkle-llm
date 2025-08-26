import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';

/**
 * Promise版本的exec函数
 */
export const execPromise = promisify(exec);

/**
 * 执行命令并返回Promise
 * @param command 要执行的命令
 * @param options 执行选项
 * @returns Promise，包含stdout和stderr
 */
export async function executeCommand(command: string, options?: ExecOptions): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execPromise(command, options);
  } catch (error) {
    console.error(`执行命令失败: ${command}`, error);
    throw error;
  }
}
