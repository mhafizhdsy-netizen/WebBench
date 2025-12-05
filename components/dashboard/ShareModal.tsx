import React, { useState } from 'react';
import { Project } from '../../types';
import { Button } from '../ui/Button';
import { X, Check, Copy, Twitter, Linkedin, Facebook, MessageCircle, Send, MessageSquare } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, project }) => {
  const [copyText, setCopyText] = useState('Copy');

  if (!isOpen || !project) return null;

  const shareUrl = `https://web-bench-ai.vercel.app/#/share/${project.id}`;
  const shareText = `Check out my project "${project.name}" on WebBench, the AI-powered web builder!`;

  const handleCopy = (feedback: string = 'Copied!') => {
    navigator.clipboard.writeText(shareUrl);
    setCopyText(feedback);
    setTimeout(() => setCopyText('Copy'), 2000);
  };

  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(project.name)}&summary=${encodeURIComponent(shareText)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-sidebar border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white">Share "{project.name}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Project Link</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="w-full bg-[#3c3c3c] border border-transparent text-gray-300 rounded px-3 py-2 text-sm outline-none font-mono"
              />
              <Button onClick={() => handleCopy()} variant="secondary" className="w-32 gap-2">
                {copyText !== 'Copy' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copyText}
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Share on social media</label>
            <div className="flex justify-center gap-4">
               <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#1DA1F2] hover:text-white transition-colors" title="Share on Twitter"><Twitter className="w-5 h-5"/></a>
               <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#1877F2] hover:text-white transition-colors" title="Share on Facebook"><Facebook className="w-5 h-5"/></a>
               <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#0A66C2] hover:text-white transition-colors" title="Share on LinkedIn"><Linkedin className="w-5 h-5"/></a>
               <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#25D366] hover:text-white transition-colors" title="Share on WhatsApp"><MessageCircle className="w-5 h-5"/></a>
               <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#0088cc] hover:text-white transition-colors" title="Share on Telegram"><Send className="w-5 h-5"/></a>
               <button onClick={() => handleCopy('Copied for Discord!')} className="p-3 bg-active rounded-full text-gray-300 hover:bg-[#5865F2] hover:text-white transition-colors" title="Copy link for Discord"><MessageSquare className="w-5 h-5"/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};