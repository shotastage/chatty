"use client";

// types.ts
export interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

  interface AnthropicResponse {
    content: Array<{
      text: string;
      type: 'text';
    }>;
    id: string;
    model: string;
    role: string;
    type: 'message';
  }

  interface AnthropicError {
    error: {
      message: string;
      type: string;
    };
  }

  // ChatWidget.tsx
  import React, { useState, useRef, useEffect } from 'react';
  import { Send, Loader2, Key, MessageCircle, X } from 'lucide-react';

  const ChatWidget: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [apiKey, setApiKey] = useState<string>(() => {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('anthropic_api_key') || '';
      }
      return '';
    });
    const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      setShowApiKeyInput(!localStorage.getItem('anthropic_api_key'));
    }, []);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (chatContainerRef.current &&
            event.target instanceof Node &&
            !chatContainerRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    const scrollToBottom = (): void => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const handleApiKeySubmit = (e: React.FormEvent): void => {
      e.preventDefault();
      if (apiKey.trim().startsWith('sk-ant-api')) {
        localStorage.setItem('anthropic_api_key', apiKey.trim());
        setShowApiKeyInput(false);
      } else {
        alert('無効なAPIキーです。"sk-ant-api"で始まるキーを入力してください。');
      }
    };

    const resetApiKey = (): void => {
      localStorage.removeItem('anthropic_api_key');
      setApiKey('');
      setShowApiKeyInput(true);
    };

    const sendMessage = async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      if (!input.trim()) return;

      const userMessage = input.trim();
      setInput('');
      setIsLoading(true);

      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages: [{ role: 'user', content: userMessage }]
          })
        });

        if (!response.ok) {
          const errorData = await response.json() as AnthropicError;
          throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json() as AnthropicResponse;
        setMessages(prev => [...prev, { role: 'assistant', content: data.content[0].text }]);
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'すみません、エラーが発生しました。もう一度お試しください。'
        }]);

        if (error instanceof Error &&
            (error.message.includes('401') || error.message.includes('unauthorized'))) {
          resetApiKey();
        }
      } finally {
        setIsLoading(false);
      }
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setInput(e.target.value);
      // テキストエリアの高さを自動調整
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void sendMessage(e);
      }
    };

    // フローティングアクションボタン
    const renderFAB = (): JSX.Element => (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 p-4 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        aria-label="チャットを開く"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );

    // APIキー入力画面
    if (showApiKeyInput) {
      return (
        <>
          {renderFAB()}
          {isOpen && (
            <div
              ref={chatContainerRef}
              className="fixed bottom-20 right-4 w-96 bg-white rounded-lg shadow-xl p-6 transform transition-all duration-200 ease-in-out"
            >
              <form onSubmit={handleApiKeySubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-5 h-5 text-gray-500" />
                    <h3 className="text-lg font-semibold">APIキーの設定</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="閉じる"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api..."
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="APIキー入力"
                  />
                  <p className="text-sm text-gray-500">
                    ※ APIキーは暗号化されずにローカルストレージに保存されます。<br />
                    本番環境では使用しないでください。
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  保存
                </button>
              </form>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        {renderFAB()}
        {isOpen && (
          <div
            ref={chatContainerRef}
            className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col transform transition-all duration-200 ease-in-out"
            role="dialog"
            aria-label="チャットウィンドウ"
          >
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Claude Chat</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetApiKey}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  title="APIキーを再設定"
                  aria-label="APIキーを再設定"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="チャットを閉じる"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              role="log"
              aria-live="polite"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    } whitespace-pre-wrap`}
                    role={message.role === 'assistant' ? 'status' : 'none'}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-1"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-2"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-3"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <textarea
                    ref={textAreaRef}
                    value={input}
                    onChange={handleTextAreaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力... (Shift + Enter で改行)"
                    className="w-full p-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto"
                    style={{
                      minHeight: '42px',
                      maxHeight: '150px'
                    }}
                    disabled={isLoading}
                    rows={1}
                    aria-label="メッセージ入力"
                  />
                  <div className="absolute right-2 bottom-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      aria-label={isLoading ? "送信中..." : "メッセージを送信"}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </>
    );
  };

  export default ChatWidget;
