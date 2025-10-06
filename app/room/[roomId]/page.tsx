'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'gif';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export default function ChatRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isVoiceCall, setIsVoiceCall] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{
    id: string;
    media_formats: {
      gif: { url: string };
      tinygif: { url: string };
    };
    content_description: string;
  }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Popular emojis
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '😎',
    '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
    '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
    '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
    '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
    '🔥', '⭐', '✨', '💫', '⚡', '💥', '💯', '✅', '❌', '⚠️'
  ];

  // Trending GIF keywords
  const trendingGifs = [
    'happy', 'sad', 'love', 'funny', 'excited', 'dance', 'celebrate',
    'thumbs up', 'clap', 'wave', 'laugh', 'cry', 'shocked', 'angry'
  ];

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
      return;
    }
    setUsername(storedUsername);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationsEnabled(permission === 'granted');
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }

    loadMessages();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `chat_room_${roomId}` && e.newValue) {
        const parsedMessages = JSON.parse(e.newValue);
        const messagesWithDates = parsedMessages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
        
        const lastMessage = messagesWithDates[messagesWithDates.length - 1];
        if (lastMessage && lastMessage.sender !== storedUsername && notificationsEnabled) {
          showNotification(lastMessage);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const pollInterval = setInterval(() => {
      loadMessages();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [roomId, router, notificationsEnabled]);

  const loadMessages = useCallback(() => {
    const storageKey = `chat_room_${roomId}`;
    const storedMessages = localStorage.getItem(storageKey);
    if (storedMessages) {
      const parsedMessages = JSON.parse(storedMessages);
      const messagesWithDates = parsedMessages.map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(messagesWithDates);
    } else {
      const welcomeMessage: Message = {
        id: '1',
        text: `Welcome to room ${roomId}! Share this room ID with others to invite them.`,
        sender: 'System',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages([welcomeMessage]);
      localStorage.setItem(storageKey, JSON.stringify([welcomeMessage]));
    }
  }, [roomId]);

  const showNotification = (message: Message) => {
    if (notificationsEnabled && document.hidden) {
      new Notification(`New message from ${message.sender}`, {
        body: message.type === 'text' ? message.text : `Sent a ${message.type}`,
        icon: '/favicon.ico',
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveMessages = (newMessages: Message[]) => {
    const storageKey = `chat_room_${roomId}`;
    localStorage.setItem(storageKey, JSON.stringify(newMessages));
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(newMessages),
    }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: username,
      timestamp: new Date(),
      type: 'text',
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInputValue('');
  };

  const handleEmojiClick = (emoji: string) => {
    setInputValue(inputValue + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gifUrl: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: 'Sent a GIF',
      sender: username,
      timestamp: new Date(),
      type: 'gif',
      fileUrl: gifUrl,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setShowGifPicker(false);
    setGifSearchQuery('');
  };

  const searchGifs = async (query: string) => {
    const apiKey = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
    const limit = 20;
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=${limit}`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      return [];
    }
  };

  useEffect(() => {
    if (gifSearchQuery.trim()) {
      const delaySearch = setTimeout(async () => {
        const results = await searchGifs(gifSearchQuery);
        setGifResults(results);
      }, 500);
      return () => clearTimeout(delaySearch);
    } else {
      setGifResults([]);
    }
  }, [gifSearchQuery]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: 'Sent an image',
        sender: username,
        timestamp: new Date(),
        type: 'image',
        fileUrl: event.target?.result as string,
        fileName: file.name,
        fileSize: file.size,
      };

      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: `Sent a file: ${file.name}`,
        sender: username,
        timestamp: new Date(),
        type: 'file',
        fileUrl: event.target?.result as string,
        fileName: file.name,
        fileSize: file.size,
      };

      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    };
    reader.readAsDataURL(file);
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsVideoCall(true);
    } catch (error) {
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const startVoiceCall = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      setIsVoiceCall(true);
    } catch (error) {
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const endCall = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsVideoCall(false);
    setIsVoiceCall(false);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    endCall();
    router.push('/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white truncate">
              💬 Chat Room
            </h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
              {username}
            </p>
          </div>
          <div className="flex gap-1 md:gap-2 flex-wrap">
            <button
              onClick={copyRoomId}
              className="px-2 md:px-4 py-1.5 md:py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm font-medium rounded-lg transition-colors duration-200"
            >
              {copied ? '✓' : 'Copy ID'}
            </button>
            <button
              onClick={copyRoomLink}
              className="px-2 md:px-4 py-1.5 md:py-2 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm font-medium rounded-lg transition-colors duration-200"
            >
              {copied ? '✓' : 'Link'}
            </button>
            <button
              onClick={leaveRoom}
              className="px-2 md:px-4 py-1.5 md:py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs md:text-sm font-medium rounded-lg transition-colors duration-200"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Room ID Display */}
      <div className="bg-blue-50 dark:bg-gray-700 border-b border-blue-200 dark:border-gray-600 px-3 md:px-4 py-2">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
            Room: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{roomId}</span>
          </p>
        </div>
      </div>

      {/* Video Call Overlay */}
      {(isVideoCall || isVoiceCall) && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-bold">
                {isVideoCall ? '📹 Video Call' : '🎤 Voice Call'}
              </h2>
              <button
                onClick={endCall}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg"
              >
                End Call
              </button>
            </div>
            {isVideoCall && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                    You
                  </div>
                </div>
                <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="text-gray-400 text-center">
                    <p>Waiting for others to join...</p>
                    <p className="text-sm mt-2">Share the room link to invite others</p>
                  </div>
                </div>
              </div>
            )}
            {isVoiceCall && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🎤</div>
                <p className="text-white text-xl">Voice call in progress...</p>
                <p className="text-gray-400 mt-2">Share the room link to invite others</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <main className="flex-1 overflow-y-auto p-2 md:p-4">
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === username ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg px-3 md:px-4 py-2 md:py-3 rounded-2xl shadow-md ${
                  message.sender === username
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : message.sender === 'System'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-gray-800 dark:text-gray-200 rounded-bl-none'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'
                }`}
              >
                {message.sender !== username && message.sender !== 'System' && (
                  <p className="text-xs font-semibold mb-1 opacity-75">
                    {message.sender}
                  </p>
                )}
                
                {message.type === 'image' && message.fileUrl && (
                  <div className="mb-2">
                    <img 
                      src={message.fileUrl} 
                      alt={message.fileName}
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(message.fileUrl, '_blank')}
                    />
                  </div>
                )}

                {message.type === 'gif' && message.fileUrl && (
                  <div className="mb-2">
                    <img 
                      src={message.fileUrl} 
                      alt="GIF"
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(message.fileUrl, '_blank')}
                    />
                  </div>
                )}
                
                {message.type === 'file' && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-black bg-opacity-10 rounded">
                    <span className="text-2xl">📎</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{message.fileName}</p>
                      <p className="text-xs opacity-75">{message.fileSize && formatFileSize(message.fileSize)}</p>
                    </div>
                    <a
                      href={message.fileUrl}
                      download={message.fileName}
                      className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30"
                    >
                      Download
                    </a>
                  </div>
                )}
                
                <p className="text-sm md:text-base break-words">
                  {message.text}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === username
                      ? 'text-blue-100'
                      : message.sender === 'System'
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Emoji Picker Overlay */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Select Emoji</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2 p-4">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-2 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GIF Picker Overlay */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[70vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Select GIF</h3>
                <button
                  onClick={() => {
                    setShowGifPicker(false);
                    setGifSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                value={gifSearchQuery}
                onChange={(e) => setGifSearchQuery(e.target.value)}
                placeholder="Search GIFs..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {!gifSearchQuery && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {trendingGifs.map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => setGifSearchQuery(keyword)}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {gifResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {gifResults.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => handleGifSelect(gif.media_formats.gif.url)}
                      className="relative aspect-square overflow-hidden rounded-lg hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={gif.media_formats.tinygif.url}
                        alt={gif.content_description}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : gifSearchQuery ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Searching for GIFs...
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Search for GIFs or select a trending keyword
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 md:p-4">
        <div className="max-w-4xl mx-auto">
          {/* Action Buttons */}
          <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg whitespace-nowrap"
            >
              😀 Emoji
            </button>
            <button
              onClick={() => setShowGifPicker(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm rounded-lg whitespace-nowrap"
            >
              GIF
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg whitespace-nowrap"
            >
              🖼️ Image
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg whitespace-nowrap"
            >
              📎 File
            </button>
            <button
              onClick={startVoiceCall}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg whitespace-nowrap"
            >
              🎤 Voice
            </button>
            <button
              onClick={startVideoCall}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg whitespace-nowrap"
            >
              📹 Video
            </button>
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 md:px-4 py-2 md:py-3 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 md:px-6 py-2 md:py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              disabled={inputValue.trim() === ''}
            >
              Send
            </button>
          </form>

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </footer>
    </div>
  );
}