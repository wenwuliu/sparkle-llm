import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Button, Tooltip, Modal, message, Space, Switch } from 'antd';
import {
  DownloadOutlined,
  FullscreenOutlined,
  CodeOutlined,
  EyeOutlined,
  CopyOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';

// 初始化 mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  htmlLabels: true,
  er: { useMaxWidth: true },
  sequence: { useMaxWidth: true },
  gantt: { useMaxWidth: true },
  pie: { useMaxWidth: true },
  fontSize: 16,
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

interface EnhancedMermaidRendererProps {
  content: string;
  height?: string;
}

const EnhancedMermaidRenderer: React.FC<EnhancedMermaidRendererProps> = ({
  content,
  height = 'auto'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  // 保留setError用于错误处理，但不使用error状态
  const [, setError] = useState<string | null>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('diagram');
  const [mermaidCode, setMermaidCode] = useState(content);
  const [editedCode, setEditedCode] = useState(content);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [theme, setTheme] = useState<'neutral' | 'dark' | 'forest'>('neutral');

  // 渲染Mermaid图表
  const renderMermaid = async (code: string) => {
    if (!chartRef.current) return;

    try {
      // 清空错误状态
      setError(null);
      setIsFixed(false);

      // 清空容器
      chartRef.current.innerHTML = '';

      try {
        // 使用mermaid的异步API
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code);

        // 保存SVG内容用于下载
        setSvgContent(svg);

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
          const fixedCode = fixMermaidSyntax(code);
          setIsFixed(true);
          setMermaidCode(fixedCode);

          // 使用修复后的代码重新渲染
          const { svg } = await mermaid.render(`mermaid-fixed-${Date.now()}`, fixedCode);

          // 保存SVG内容用于下载
          setSvgContent(svg);

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
  };

  // 初始渲染
  useEffect(() => {
    setMermaidCode(content);
    setEditedCode(content);
    renderMermaid(content);
  }, [content]);

  // 当编辑的代码变化且自动刷新开启时，重新渲染
  useEffect(() => {
    if (isAutoRefresh && activeTab === 'code') {
      const timer = setTimeout(() => {
        renderMermaid(editedCode);
      }, 1000); // 延迟1秒，避免频繁渲染

      return () => clearTimeout(timer);
    }
  }, [editedCode, isAutoRefresh, activeTab]);

  // 当主题变化时，更新配置并重新渲染
  useEffect(() => {
    // 直接重新初始化Mermaid配置，不使用getConfig方法
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      htmlLabels: true,
      er: { useMaxWidth: true },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
      pie: { useMaxWidth: true },
      fontSize: 16,
      logLevel: 'error',
      fontFamily: 'sans-serif'
    });

    if (activeTab === 'diagram') {
      renderMermaid(mermaidCode);
    }
  }, [theme, mermaidCode, activeTab]);

  // 下载SVG图片
  const downloadSvg = () => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mermaid-diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('SVG图片已下载');
  };

  // 下载PNG图片
  const downloadPng = () => {
    if (!chartRef.current) return;

    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'mermaid-diagram.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      message.success('PNG图片已下载');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // 复制Mermaid代码
  const copyCode = () => {
    navigator.clipboard.writeText(mermaidCode)
      .then(() => message.success('代码已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 应用编辑后的代码
  const applyCode = () => {
    setMermaidCode(editedCode);
    renderMermaid(editedCode);
    setActiveTab('diagram');
    message.success('已应用新的图表代码');
  };

  return (
    <div className="enhanced-mermaid-renderer" style={{ width: '100%', margin: '0' }}>
      <div className="mermaid-toolbar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        background: '#f5f5f5',
        padding: '4px 8px',
        borderRadius: '4px',
        alignItems: 'center'
      }}>
        {/* 左侧切换按钮 */}
        <div>
          <Tooltip title={activeTab === 'diagram' ? '切换到代码视图' : '切换到图表视图'}>
            <Button
              type={activeTab === 'diagram' ? 'default' : 'primary'}
              icon={activeTab === 'diagram' ? <CodeOutlined /> : <EyeOutlined />}
              onClick={() => setActiveTab(activeTab === 'diagram' ? 'code' : 'diagram')}
            >
              {activeTab === 'diagram' ? '代码' : '图表'}
            </Button>
          </Tooltip>
        </div>

        {/* 中间提示信息 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {isFixed && (
            <div style={{ color: 'orange', fontSize: '0.8em', display: 'inline-block' }}>
              注意：图表代码已自动修复以正确显示
            </div>
          )}
        </div>

        {/* 右侧功能按钮 */}
        <Space>
          {activeTab === 'diagram' && (
            <>
              <Tooltip title="全屏查看">
                <Button
                  icon={<FullscreenOutlined />}
                  onClick={() => setIsFullscreen(true)}
                />
              </Tooltip>

              <Tooltip title="下载SVG">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadSvg}
                />
              </Tooltip>

              <Tooltip title="复制代码">
                <Button
                  icon={<CopyOutlined />}
                  onClick={copyCode}
                />
              </Tooltip>
            </>
          )}

          {activeTab === 'code' && (
            <>
              <Button
                type="primary"
                onClick={applyCode}
              >
                应用更改
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setEditedCode(mermaidCode);
                  message.info('已重置为当前图表代码');
                }}
              >
                重置
              </Button>

              <Switch
                checkedChildren="自动刷新"
                unCheckedChildren="手动刷新"
                checked={isAutoRefresh}
                onChange={setIsAutoRefresh}
              />
            </>
          )}

          <Tooltip title="设置">
            <Button
              icon={<SettingOutlined />}
              onClick={() => setIsSettingsVisible(true)}
            />
          </Tooltip>
        </Space>
      </div>

      {activeTab === 'diagram' ? (
        <div
          className="mermaid-container"
          style={{
            width: '100%',
            minHeight: height === 'auto' ? '200px' : height,
            border: '1px solid #e8e8e8',
            borderRadius: '4px',
            padding: '8px',
            overflow: 'auto'
          }}
        >
          <div
            ref={chartRef}
            style={{
              width: '100%',
              minWidth: '500px',
              margin: '0 auto',
              display: 'block'
            }}
          ></div>
        </div>
      ) : (
        <div className="code-editor-container" style={{ width: '100%' }}>
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            style={{
              width: '100%',
              minHeight: '300px', // 增加高度，提供更多编辑空间
              fontFamily: 'monospace',
              padding: '10px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              resize: 'vertical'
            }}
          />
        </div>
      )}

      {/* 全屏模态框 */}
      <Modal
        title="全屏查看图表"
        open={isFullscreen}
        onCancel={() => setIsFullscreen(false)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="download-svg" icon={<DownloadOutlined />} onClick={downloadSvg}>
            下载SVG
          </Button>,
          <Button key="download-png" icon={<DownloadOutlined />} onClick={downloadPng}>
            下载PNG
          </Button>,
          <Button key="close" onClick={() => setIsFullscreen(false)}>
            关闭
          </Button>
        ]}
      >
        <div style={{ height: 'calc(90vh - 120px)', overflow: 'auto' }}>
          <div
            dangerouslySetInnerHTML={{ __html: svgContent.replace('<svg ', '<svg style="width:100%;height:auto;min-width:800px;font-size:16px;" ') }}
          />
        </div>
      </Modal>

      {/* 设置模态框 */}
      <Modal
        title="图表设置"
        open={isSettingsVisible}
        onCancel={() => setIsSettingsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsSettingsVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div style={{ marginBottom: '20px' }}>
          <h4>主题选择</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div
              onClick={() => setTheme('neutral')}
              style={{
                padding: '10px',
                border: `2px solid ${theme === 'neutral' ? '#1890ff' : '#d9d9d9'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                background: '#f5f5f5'
              }}
            >
              默认主题
            </div>
            <div
              onClick={() => setTheme('dark')}
              style={{
                padding: '10px',
                border: `2px solid ${theme === 'dark' ? '#1890ff' : '#d9d9d9'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                background: '#333',
                color: '#fff'
              }}
            >
              暗色主题
            </div>
            <div
              onClick={() => setTheme('forest')}
              style={{
                padding: '10px',
                border: `2px solid ${theme === 'forest' ? '#1890ff' : '#d9d9d9'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                background: '#cfe8cf'
              }}
            >
              森林主题
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EnhancedMermaidRenderer;
