import React from 'react';
import EnhancedMarkdownRenderer from './EnhancedMarkdownRenderer';

interface EnhancedMarkdownContentProps {
  content: string;
}

const EnhancedMarkdownContent: React.FC<EnhancedMarkdownContentProps> = ({ content }) => {

  return <EnhancedMarkdownRenderer content={content} />;
};

export default EnhancedMarkdownContent;
