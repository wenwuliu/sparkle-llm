import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import * as echarts from 'echarts';
import { Button, Tooltip, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import copy from 'copy-to-clipboard';

// 初始化 mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis' // 使用平滑曲线
  },
  htmlLabels: true, // 确保使用HTML标签
  er: { useMaxWidth: true },
  sequence: { useMaxWidth: true },
  gantt: { useMaxWidth: true },
  pie: { useMaxWidth: true },
  // 全局字体大小设置
  fontSize: 16, // 增大默认字体大小
  // 图表尺寸设置
  logLevel: 'error',
  fontFamily: 'sans-serif'
});

// 修复 Mermaid 语法错误
const fixMermaidSyntax = (code: string): string => {
  return code
    // 修复缺失的节点定义
    .replace(/([A-Za-z0-9_]+)(\s*-->)/g, (match, p1, p2) => {
      if (!code.includes(`${p1}[`) && !code.includes(`${p1}(`) && !code.includes(`${p1}{`)) {
        return `${p1}[${p1}]${p2}`;
      }
      return match;
    })
    // 修复箭头间距
    .replace(/-->/g, ' --> ')
    // 修复重复括号
    .replace(/\[\[/g, '[')
    .replace(/\]\]/g, ']')
    // 修复缺失的结束标记
    .replace(/graph\s+([A-Z]+)\s+(?!\{)/g, 'graph $1\n');
};

// 修复 ECharts 配置错误
const fixEChartsConfig = (jsonStr: string): string => {
  try {
    // 尝试解析 JSON
    const config = JSON.parse(jsonStr);

    // 确保基本结构存在
    if (!config.series) config.series = [];
    if (config.series.length > 0 && !config.series[0].type) {
      config.series[0].type = 'bar'; // 默认图表类型
    }

    // 确保 xAxis 和 yAxis 存在
    if (!config.xAxis) config.xAxis = {};
    if (!config.yAxis) config.yAxis = {};

    return JSON.stringify(config, null, 2);
  } catch (e) {
    // 如果 JSON 解析失败，尝试修复常见错误
    return jsonStr
      // 修复缺失的引号
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      // 修复多余的逗号
      .replace(/,(\s*[}\]])/g, '$1');
  }
};

interface ChartRendererProps {
  content: string;
  type: 'mermaid' | 'echarts';
  height?: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  content,
  type,
  height = '400px'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [formattedCode, setFormattedCode] = useState<string>(content);

  // 复制代码到剪贴板
  const copyCode = () => {
    if (copy(formattedCode)) {
      message.success('图表代码已复制到剪贴板');
    } else {
      message.error('复制失败，请手动复制');
    }
  };

  useEffect(() => {
    if (!chartRef.current) return;

    // 清空错误状态
    setError(null);
    setIsFixed(false);

    // 清空容器
    chartRef.current.innerHTML = '';

    if (type === 'mermaid') {
      let mermaidCode = content;

      try {
        // 使用异步方式渲染Mermaid图表
        const renderAsync = async () => {
          try {
            // 使用mermaid的异步API
            const { svg } = await mermaid.render(`mermaid-${Date.now()}`, mermaidCode);

            // 安全地将SVG代码添加到实际容器
            if (chartRef.current) {
              // 确保SVG根元素有正确的样式
              const processedSvg = svg.replace('<svg ', '<svg style="display:block;width:100%;height:auto;min-width:500px;font-size:16px;font-family:sans-serif;" ');
              chartRef.current.innerHTML = processedSvg;

              // 增强SVG中的文本可读性
              const svgElement = chartRef.current.querySelector('svg');
              if (svgElement) {
                // 查找所有文本元素并增大字体
                const textElements = svgElement.querySelectorAll('text');
                textElements.forEach((text: SVGTextElement) => {
                  // 设置最小字体大小
                  const currentSize = parseFloat(window.getComputedStyle(text).fontSize);
                  if (currentSize < 14) {
                    text.style.fontSize = '14px';
                  }
                  // 确保文本清晰可见
                  text.style.fontWeight = '500';
                });

                // 调整节点大小以适应文本
                const nodes = svgElement.querySelectorAll('.node');
                nodes.forEach((node) => {
                  if (node instanceof SVGElement) {
                    node.style.margin = '8px';
                    node.style.padding = '4px';
                  }
                });
              }
            }
          } catch (error) {
            // 如果渲染失败，尝试修复
            try {
              mermaidCode = fixMermaidSyntax(mermaidCode);
              setIsFixed(true);

              // 使用修复后的代码重新渲染
              const { svg } = await mermaid.render(`mermaid-fixed-${Date.now()}`, mermaidCode);

              // 安全地将SVG代码添加到实际容器
              if (chartRef.current) {
                // 确保SVG根元素有正确的样式
                const processedSvg = svg.replace('<svg ', '<svg style="display:block;width:100%;height:auto;min-width:500px;font-size:16px;font-family:sans-serif;" ');
                chartRef.current.innerHTML = processedSvg;

                // 增强SVG中的文本可读性
                const svgElement = chartRef.current.querySelector('svg');
                if (svgElement) {
                  // 查找所有文本元素并增大字体
                  const textElements = svgElement.querySelectorAll('text');
                  textElements.forEach((text: SVGTextElement) => {
                    // 设置最小字体大小
                    const currentSize = parseFloat(window.getComputedStyle(text).fontSize);
                    if (currentSize < 14) {
                      text.style.fontSize = '14px';
                    }
                    // 确保文本清晰可见
                    text.style.fontWeight = '500';
                  });

                  // 调整节点大小以适应文本
                  const nodes = svgElement.querySelectorAll('.node');
                  nodes.forEach((node) => {
                    if (node instanceof SVGElement) {
                      node.style.margin = '8px';
                      node.style.padding = '4px';
                    }
                  });
                }
              }
            } catch (fixedError) {
              // 如果修复后仍然失败
              console.error('Mermaid rendering error:', fixedError);
              setError(fixedError instanceof Error ? fixedError.message : String(fixedError));

              if (chartRef.current) {
                chartRef.current.innerHTML = `<div class="error-message" style="color: red; padding: 10px; border: 1px solid red; display: block; margin: 0;">
图表渲染错误: ${fixedError instanceof Error ? fixedError.message : String(fixedError)}
</div>`;
              }
            }
          }
        };

        // 执行异步渲染
        renderAsync().catch(error => {
          console.error('Async rendering error:', error);
          setError(error instanceof Error ? error.message : String(error));

          if (chartRef.current) {
            chartRef.current.innerHTML = `<div class="error-message" style="color: red; padding: 10px; border: 1px solid red; display: block; margin: 0;">
异步渲染错误: ${error instanceof Error ? error.message : String(error)}
</div>`;
          }
        });
      } catch (error) {
        // 捕获任何其他错误
        console.error('Unexpected error:', error);
        setError(error instanceof Error ? error.message : String(error));

        if (chartRef.current) {
          chartRef.current.innerHTML = `<div class="error-message" style="color: red; padding: 10px; border: 1px solid red; display: block; margin: 0;">
意外错误: ${error instanceof Error ? error.message : String(error)}
</div>`;
        }
      }
    } else if (type === 'echarts') {
      let echartsConfig = content;
      let chart: echarts.ECharts | null = null;

      try {
        // 创建 ECharts 实例
        chart = echarts.init(chartRef.current);

        // 解析 JSON 配置
        const option = JSON.parse(echartsConfig);

        // 更新格式化后的代码
        const formattedOption = JSON.stringify(option, null, 2);
        setFormattedCode(formattedOption);

        // 设置图表配置
        chart.setOption(option);
      } catch (originalError) {
        // 如果渲染失败，尝试修复
        try {
          echartsConfig = fixEChartsConfig(echartsConfig);
          setIsFixed(true);

          // 如果已创建图表实例，先销毁
          if (chart) {
            chart.dispose();
          }

          // 创建新的 ECharts 实例
          chart = echarts.init(chartRef.current);

          // 解析修复后的 JSON 配置
          const option = JSON.parse(echartsConfig);

          // 更新格式化后的代码
          const formattedOption = JSON.stringify(option, null, 2);
          setFormattedCode(formattedOption);

          // 设置图表配置
          chart.setOption(option);
        } catch (fixedError) {
          // 如果修复后仍然失败
          console.error('ECharts rendering error:', fixedError);
          setError(fixedError instanceof Error ? fixedError.message : String(fixedError));

          if (chartRef.current) {
            chartRef.current.innerHTML = `<div class="error-message" style="color: red; padding: 10px; border: 1px solid red;">
              图表渲染错误: ${fixedError instanceof Error ? fixedError.message : String(fixedError)}
            </div>`;
          }

          // 如果已创建图表实例，销毁
          if (chart) {
            chart.dispose();
            chart = null;
          }
        }
      }

      // 设置响应式调整
      if (chart) {
        const resizeHandler = () => chart?.resize();
        window.addEventListener('resize', resizeHandler);

        // 清理函数
        return () => {
          window.removeEventListener('resize', resizeHandler);
          chart?.dispose();
        };
      }
    }
  }, [content, type]);

  // 使用div标签包裹，避免HTML嵌套问题
  return (
    <div className="chart-container" style={{
      display: 'block',
      margin: '20px 0',
      padding: '10px',
      background: 'transparent',
      overflow: 'visible',
      border: 'none',
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* 图表标题栏 */}
      {type === 'echarts' && !error && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <Tooltip title="复制ECharts代码">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={copyCode}
              size="small"
            >
              复制代码
            </Button>
          </Tooltip>
        </div>
      )}

      {/* 图表容器 */}
      <div
        ref={chartRef}
        style={{
          width: '100%',
          minWidth: '500px', // 设置最小宽度
          height,
          margin: '0 auto', // 居中显示
          display: 'block',
          overflow: 'auto', // 如果内容过大，允许滚动
          border: type === 'echarts' && !error ? '1px solid #f0f0f0' : 'none',
          borderRadius: '4px'
        }}
      ></div>

      {/* 提示信息 */}
      {isFixed && !error && (
        <div className="fixed-notice" style={{ color: 'orange', fontSize: '0.8em', textAlign: 'center', display: 'block', marginTop: '8px' }}>
          注意：图表代码已自动修复以正确显示
        </div>
      )}
    </div>
  );
};

export default ChartRenderer;
