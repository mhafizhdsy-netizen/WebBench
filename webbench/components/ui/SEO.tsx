import React from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
}

export const SEO: React.FC<SEOProps> = ({ title, description, keywords }) => {
  React.useEffect(() => {
    // Default values
    const defaultTitle = 'WebBench - AI Web Builder';
    const defaultDescription = 'AI-Powered Native Web Builder with a VS Code-like experience. Build, preview, and deploy websites at the speed of thought.';
    const defaultOgImage = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><style>.title { font: bold 90px 'Inter', sans-serif; fill: white; } .subtitle { font: 50px 'Inter', sans-serif; fill: #cccccc; }</style></defs><rect width='1200' height='630' fill='#1e1e1e'/><g transform='translate(540, 160) scale(3)'><path d='M40 4.9V47L20 58l-20-11V4.9L20 -6.1z' fill='#007acc' fill-opacity='0.2' stroke='#007acc' stroke-width='2'/><path d='M13.33 20.83l-8.33 8.34 8.33 8.33' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/><path d='M26.67 20.83l8.33 8.34-8.33 8.33' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></g><text x='600' y='450' class='title' text-anchor='middle'>WebBench</text><text x='600' y='520' class='subtitle' text-anchor='middle'>The AI-Powered Web Builder</text></svg>`
    )}`;

    const finalTitle = title ? `${title} | WebBench` : defaultTitle;
    document.title = finalTitle;
    
    const metaDescription = description || defaultDescription;

    // Helper to update or create a meta tag
    const updateMeta = (nameOrProperty: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property='${nameOrProperty}']` : `meta[name='${nameOrProperty}']`;
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        if (isProperty) {
          element.setAttribute('property', nameOrProperty);
        } else {
          element.setAttribute('name', nameOrProperty);
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    
    updateMeta('description', metaDescription);
    if (keywords) {
        updateMeta('keywords', keywords);
    }

    // Open Graph Tags
    updateMeta('og:title', finalTitle, true);
    updateMeta('og:description', metaDescription, true);
    updateMeta('og:type', 'website', true);
    updateMeta('og:url', window.location.href, true);
    updateMeta('og:image', defaultOgImage, true); // Keep default OG image for simplicity across all pages

  }, [title, description, keywords]);

  return null;
};