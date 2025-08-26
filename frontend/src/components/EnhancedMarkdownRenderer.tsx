import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Table, Collapse, Typography, Image } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import ChartRenderer from './ChartRenderer';
import EnhancedMermaidRenderer from './EnhancedMermaidRenderer';

const { Panel } = Collapse;
const { Text } = Typography;

interface EnhancedMarkdownRendererProps {
  content: string;
}

const EnhancedMarkdownRenderer: React.FC<EnhancedMarkdownRendererProps> = ({ content }) => {
  const [expandedThinking, setExpandedThinking] = useState<string[]>([]);

  // 处理思考内容（保留兼容性，用于处理旧的<think>标签）
  const processThinkingContent = (content: string) => {
    // 确保content是字符串类型
    if (typeof content !== 'string') {
      console.warn('EnhancedMarkdownRenderer: content is not a string', content);
      return { processedContent: String(content || ''), thinkingBlocks: [] };
    }

    // 查找所有<think>...</think>标签
    const thinkingRegex = /<think>([\s\S]*?)<\/think>/g;

    // 使用安全的方式获取匹配结果
    let thinkingMatches;
    try {
      thinkingMatches = [...content.matchAll(thinkingRegex)];
    } catch (error) {
      console.error('Error using matchAll:', error);
      // 降级处理：使用正则exec方法作为替代
      const matches = [];
      let match;
      while ((match = thinkingRegex.exec(content)) !== null) {
        matches.push(match);
      }
      thinkingMatches = matches;
    }

    if (!thinkingMatches || thinkingMatches.length === 0) {
      return { processedContent: content, thinkingBlocks: [] };
    }

    // 替换思考内容为占位符
    let processedContent = content;
    const thinkingBlocks: { id: string; content: string }[] = [];

    thinkingMatches.forEach((match, index) => {
      const fullMatch = match[0];
      const thinkingContent = match[1];
      const thinkingId = `thinking-${index}`;

      // 保存思考内容
      thinkingBlocks.push({
        id: thinkingId,
        content: thinkingContent.trim()
      });

      // 从原始内容中移除<think>标签
      processedContent = processedContent.replace(fullMatch, '');
    });

    return { processedContent, thinkingBlocks };
  };

  // 使用useMemo缓存处理结果，避免重复计算
  const { processedContent, thinkingBlocks } = React.useMemo(() => {
    return processThinkingContent(content);
  }, [content]);

  // 渲染思考内容
  const renderThinkingBlock = (id: string, thinkingContent: string) => {
    const isExpanded = expandedThinking.includes(id);

    return (
      <div className="thinking-block" key={id}>
        <Collapse
          ghost
          expandIcon={({ isActive }) => (
            <BulbOutlined style={{ color: isActive ? '#faad14' : '#8c8c8c' }} />
          )}
          onChange={(keys) => {
            if (keys.includes(id)) {
              setExpandedThinking([...expandedThinking, id]);
            } else {
              setExpandedThinking(expandedThinking.filter(key => key !== id));
            }
          }}
        >
          <Panel
            header={
              <Text style={{ color: '#8c8c8c' }}>
                <BulbOutlined style={{ marginRight: '8px' }} />
                思考过程 {isExpanded ? '(点击收起)' : '(点击展开)'}
              </Text>
            }
            key={id}
          >
            <div className="thinking-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="thinking-code-block">
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div" // 使用div，避免pre嵌套问题
                          codeTagProps={{ style: { fontFamily: 'monospace' } }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {thinkingContent}
              </ReactMarkdown>
            </div>
          </Panel>
        </Collapse>
      </div>
    );
  };

  // 直接使用一个更简单的方法 - 在渲染前将<think>标签内容提取出来
  const extractAndRenderThinking = () => {
    // 如果有思考块，渲染它们
    if (thinkingBlocks.length > 0) {
      return thinkingBlocks.map(block => renderThinkingBlock(block.id, block.content));
    }
    return null;
  };

  // 使用useMemo缓存组件渲染，避免重复计算
  const thinkingBlocksContent = React.useMemo(() => {
    return extractAndRenderThinking();
  }, [thinkingBlocks, expandedThinking]);

  // 使用useMemo缓存Markdown组件配置
  const markdownComponents = React.useMemo(() => {
    return {
      // 代码块高亮和图表渲染
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');

        // 如果是内联代码，直接返回
        if (inline) {
          return <code className={className} {...props}>{children}</code>;
        }

        // 如果是 Mermaid 代码块
        if (match && match[1] === 'mermaid') {
          // 使用增强型Mermaid渲染组件
          return (
            <div className="markdown-code-block" style={{
              width: '100%',
              maxWidth: '100%',
              margin: '0',
              padding: '0',
              overflow: 'visible'
            }}>
              <EnhancedMermaidRenderer
                content={String(children).replace(/\n$/, '')}
                height="auto" // 自适应高度
              />
            </div>
          );
        }

        // 如果是 ECharts 代码块
        if (match && match[1] === 'echarts') {
          // 使用自定义渲染，避免嵌套问题
          return (
            <div className="markdown-code-block" style={{
              width: '100%',
              maxWidth: '100%',
              margin: '0',
              padding: '0',
              overflow: 'visible'
            }}>
              <ChartRenderer
                content={String(children).replace(/\n$/, '')}
                type="echarts"
                height="400px" // 固定高度，适合数据可视化
              />
            </div>
          );
        }

        // 其他代码块使用语法高亮，但避免嵌套问题
        return (
          <div className="markdown-code-block">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={(match && match[1]) || 'text'}
              PreTag="div" // 使用div，避免pre嵌套问题
              codeTagProps={{ style: { fontFamily: 'monospace' } }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        );
      },

      // 表格样式优化
      table({ node }: any) {
        // 从子元素中提取表头和表体数据
        const tableData: any[] = [];
        const columns: any[] = [];

        if (node && node.children) {
          // 处理表头
          const thead = node.children.find((child: any) => child.tagName === 'thead');
          if (thead && thead.children && thead.children.length > 0) {
            const headerRow = thead.children[0];
            if (headerRow.children) {
              headerRow.children.forEach((th: any, index: number) => {
                if (th.children && th.children.length > 0) {
                  columns.push({
                    title: th.children[0].value,
                    dataIndex: `col${index}`,
                    key: `col${index}`,
                  });
                }
              });
            }
          }

          // 处理表体
          const tbody = node.children.find((child: any) => child.tagName === 'tbody');
          if (tbody && tbody.children) {
            tbody.children.forEach((tr: any, rowIndex: number) => {
              const rowData: any = { key: rowIndex };
              if (tr.children) {
                tr.children.forEach((td: any, colIndex: number) => {
                  if (td.children && td.children.length > 0) {
                    // 递归提取所有子节点的文本内容
                    const extractTextContent = (node: any): string => {
                      if (!node) return '';
                      if (node.value) return node.value;
                      if (node.children && node.children.length > 0) {
                        return node.children.map(extractTextContent).join('');
                      }
                      return '';
                    };

                    // 提取单元格中所有内容
                    rowData[`col${colIndex}`] = td.children.map(extractTextContent).join('');
                  } else {
                    rowData[`col${colIndex}`] = '';
                  }
                });
              }
              tableData.push(rowData);
            });
          }
        }

        return (
          <Table
            dataSource={tableData}
            columns={columns}
            pagination={false}
            size="small"
            bordered
            style={{ marginBottom: '16px' }}
          />
        );
      },

      // 图片处理
      img: ({ node, ...props }: any) => (
        <Image
          style={{
            maxWidth: '100%',
            margin: '0.5em 0',
            height: 'auto',
            maxHeight: '200px',
            objectFit: 'contain'
          }}
          {...props}
          alt={props.alt || 'image'}
          preview={{
            mask: '点击查看大图',
            maskClassName: 'image-preview-mask'
          }}
          loading="lazy"
          placeholder={
            <div style={{
              background: '#f0f0f0',
              height: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span>加载中...</span>
            </div>
          }
        />
      ),

      // 其他元素样式优化
      h1: ({ node, ...props }: any) => <h1 style={{ borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' }} {...props} />,
      h2: ({ node, ...props }: any) => <h2 style={{ borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' }} {...props} />,
      h3: ({ node, ...props }: any) => <h3 style={{ paddingBottom: '0.3em' }} {...props} />,
      a: ({ node, ...props }: any) => <a style={{ color: '#1890ff' }} target="_blank" rel="noopener noreferrer" {...props} />,
      blockquote: ({ node, ...props }: any) => (
        <blockquote
          style={{
            borderLeft: '4px solid #dfe2e5',
            paddingLeft: '1em',
            color: '#6a737d',
            margin: '1em 0',
          }}
          {...props}
        />
      ),
    };
  }, [thinkingBlocks, expandedThinking]);

  return (
    <div className="enhanced-markdown-content">
      {/* 先渲染所有思考块 */}
      {thinkingBlocksContent}

      {/* 然后渲染主要内容 */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default EnhancedMarkdownRenderer;
