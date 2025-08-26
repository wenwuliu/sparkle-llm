/**
 * Shell命令工具
 *
 * 文件操作示例:
 * - 读取文件: cat file.txt
 * - 写入文件: echo "content" > file.txt (覆盖) 或 echo "content" >> file.txt (追加)
 * - 搜索文件: find directory -name "pattern" -type f
 * - 创建目录: mkdir -p directory
 * - 复制文件: cp source destination
 * - 移动文件: mv source destination
 * - 查看文件属性: ls -la file.txt
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { RiskLevel, ToolCategory } from '../tools.types';
import { toolManager } from '../tool.manager';
import { sudoPermissionService } from '../../sudo/sudo-permission.service';

// 将exec转换为Promise版本
const execPromise = promisify(exec);

/**
 * 注册Shell工具
 */
export function registerShellTools(): void {
  // 安全Shell工具
  toolManager.registerTool({
    name: 'safe_shell',
    description: '执行Shell命令，支持大多数系统操作，包括文件读写、搜索等文件操作，但禁止危及系统安全的命令。重要：通过工具参数传入的命令必须是有效的 JSON 字符串；若命令内包含引号或脚本片段（HTML/JS/CSS/多行shell），请确保完成必要的转义。例如：在 JSON 字符串中必须将双引号转义为 \\\"，反斜杠转义为 \\\\\n；或者优先使用 here-doc 且使用单引号定界符（如 << \'EOF\' ... EOF）以减少转义；总之，确保工具参数可被 JSON.parse 正确解析。',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的Shell命令。若包含脚本/HTML等多行内容，必须满足：1) 参数整体为合法 JSON 字符串；2) 内部引号与反斜杠已正确转义（例如 \" -> \\\"，\\ -> \\\\）；或使用 here-doc 单引号定界符（<< \'EOF\' ... EOF）以减少转义；否则将导致 JSON 解析失败。',
        },
        risk_level: {
          type: 'string',
          description: '命令的风险等级，用于二次确认',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
        use_sudo: {
          type: 'boolean',
          description: '是否使用sudo权限执行命令',
          default: false,
        },
      },
      required: ['command'],
    },
    handler: async (input: {
      command: string;
      risk_level?: RiskLevel;
      use_sudo?: boolean;
    }) => {
      // 基本输入校验与规范化
      if (!input || typeof input.command !== 'string') {
        return {
          error: '无效的输入：缺少 command 字符串参数',
          success: false,
          risk_level: 'high',
        };
      }

      const { risk_level = 'medium', use_sudo = false } = input;
      const command = input.command;

      // 检测命令是否以sudo开头，如果是，则自动设置use_sudo为true
      const isSudoCommand = command.trim().startsWith('sudo ');
      const actualCommand = isSudoCommand ? command.trim().substring(5) : command;
      const shouldUseSudo = use_sudo || isSudoCommand;

      // 危险命令黑名单正则表达式
      const dangerousCommandPatterns = [
        /rm\s+(-[rfs]+\s+)?\/(\w+\/)*$/,                      // 删除根目录或系统目录
        /rm\s+(-[rfs]+\s+)?\/etc\//,                          // 删除系统配置
        /rm\s+(-[rfs]+\s+)?\/usr\//,                          // 删除系统程序
        /rm\s+(-[rfs]+\s+)?\/var\//,                          // 删除系统变量
        /rm\s+(-[rfs]+\s+)?\/boot\//,                         // 删除启动文件
        /rm\s+(-[rfs]+\s+)?\/bin\//,                          // 删除系统命令
        /rm\s+(-[rfs]+\s+)?\/sbin\//,                         // 删除系统命令
        /rm\s+(-[rfs]+\s+)?\/lib\//,                          // 删除系统库
        /rm\s+(-[rfs]+\s+)?\/lib64\//,                        // 删除系统库
        /rm\s+(-[rfs]+\s+)?\/dev\//,                          // 删除设备文件
        /rm\s+(-[rfs]+\s+)?\/proc\//,                         // 删除进程信息
        /rm\s+(-[rfs]+\s+)?\/sys\//,                          // 删除系统信息
        /mkfs/,                                               // 格式化文件系统
        /dd\s+if=.*\s+of=\/dev\//,                            // 写入设备
        /shutdown/,                                           // 关机
        /reboot/,                                             // 重启
        /halt/,                                               // 停机
        /init\s+[0-6]/,                                       // 改变运行级别
        /:(){ :|:& };:/,                                      // Fork炸弹
        /chmod\s+777/,                                        // 设置危险权限
        /chmod\s+-[R]+\s+777/,                                // 递归设置危险权限
        /chown\s+-[R]+\s+root/,                               // 更改所有者为root
        /mv\s+.*\s+\/etc\/passwd/,                            // 覆盖密码文件
        /mv\s+.*\s+\/etc\/shadow/,                            // 覆盖影子密码文件
        /mv\s+.*\s+\/etc\/sudoers/,                           // 覆盖sudo配置
        /curl\s+.*\s+\|\s+bash/,                              // 下载并执行脚本
        /wget\s+.*\s+\|\s+bash/,                              // 下载并执行脚本
        /curl\s+.*\s+\|\s+sh/,                                // 下载并执行脚本
        /wget\s+.*\s+\|\s+sh/,                                // 下载并执行脚本
        /\s+>\s+\/etc\//,                                     // 重定向到系统配置
        /\s+>\s+\/usr\//,                                     // 重定向到系统程序
        /\s+>\s+\/var\//,                                     // 重定向到系统变量
        /\s+>\s+\/boot\//,                                    // 重定向到启动文件
        /\s+>\s+\/bin\//,                                     // 重定向到系统命令
        /\s+>\s+\/sbin\//,                                    // 重定向到系统命令
      ];

      // 检查命令是否在黑名单中
      const isDangerousCommand = dangerousCommandPatterns.some(pattern => pattern.test(command));

      if (isDangerousCommand) {
        return {
          error: '危险命令。该命令可能会危及系统安全，不允许执行。',
          risk_level: 'high',
          command,
          success: false,
        };
      }

      // 如果需要sudo权限
      if (shouldUseSudo) {
        // 生成请求ID
        const requestId = uuidv4();

        // 检查是否已有权限记忆
        const hasPermission = await sudoPermissionService.checkPermission(actualCommand);

        if (!hasPermission) {
          try {
            // 请求sudo权限
            const permissionResult = await sudoPermissionService.requestPermission({
              requestId,
              command: actualCommand,
              riskLevel: risk_level
            });

            if (!permissionResult.granted) {
              return {
                command,
                error: '用户拒绝sudo权限请求',
                success: false,
                risk_level,
              };
            }

            // 如果用户选择记住决定
            if (permissionResult.remember) {
              sudoPermissionService.savePermission(actualCommand, true);
            }
          } catch (error) {
            return {
              command,
              error: `sudo权限请求失败: ${error instanceof Error ? error.message : String(error)}`,
              success: false,
              risk_level,
            };
          }
        }

        try {
          // 获取sudo密码
          const password = sudoPermissionService.getSudoPassword(requestId);

          // 执行sudo命令
          // 使用sudo -S，允许从标准输入读取密码
          // 检查命令是否包含重定向符号(>)，如果包含，则使用bash -c包装命令
          const sudoCommand = actualCommand.includes('>') || actualCommand.includes('>>') || actualCommand.includes('|')
            ? `sudo -S bash -c "${actualCommand.replace(/"/g, '\\"')}"`
            : `sudo -S ${actualCommand}`;

          console.log(`执行sudo命令: ${sudoCommand}`);

          const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            const childProcess = exec(sudoCommand);

            let stdoutData = '';
            let stderrData = '';

            // 如果有密码，则写入密码
            if (password && childProcess.stdin) {
              childProcess.stdin.write(password + '\n');
              childProcess.stdin.end();
            }

            // 收集输出
            childProcess.stdout?.on('data', (data) => {
              stdoutData += data;
            });

            childProcess.stderr?.on('data', (data) => {
              stderrData += data;
            });

            // 处理完成
            childProcess.on('close', (code) => {
              if (code === 0) {
                resolve({ stdout: stdoutData, stderr: stderrData });
              } else {
                reject(new Error(`命令执行失败，退出码: ${code}\n${stderrData}`));
              }
            });

            // 处理错误
            childProcess.on('error', (error) => {
              reject(error);
            });
          });

          // 清除密码
          sudoPermissionService.clearSudoPassword(requestId);

          const stdoutStr = String(stdout || '');
          const stderrStr = String(stderr || '');

          return {
            command,
            stdout: stdoutStr.trim(),
            stderr: stderrStr.trim(),
            success: stderrStr.trim() === '',
            risk_level,
            sudo: true,
          };
        } catch (error) {
          return {
            command,
            error: error instanceof Error ? error.message : String(error),
            success: false,
            risk_level,
            sudo: true,
          };
        }
      } else {
        try {
          // 执行普通命令，增加超时与缓冲限制，避免卡死与超大输出
          const { stdout, stderr } = await execPromise(command, {
            timeout: 60_000, // 60 秒超时
            maxBuffer: 5 * 1024 * 1024, // 5MB 输出上限
          } as any);

          const stdoutStr = String(stdout || '');
          const stderrStr = String(stderr || '');

          return {
            command,
            stdout: stdoutStr.trim(),
            stderr: stderrStr.trim(),
            success: stderrStr.trim() === '',
            risk_level,
          };
        } catch (error) {
          return {
            command,
            error: error instanceof Error ? error.message : String(error),
            success: false,
            risk_level,
          };
        }
      }
    },
    requires_auth: false,
    category: ToolCategory.SYSTEM,
  });
}
