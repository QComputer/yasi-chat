'use client';

import { useState, useRef, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

type MessageType = 'text' | 'video' | 'audio' | 'image';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('message', (msg: any) => {
      const receivedMessage: Message = {
        ...msg,
        timestamp: new Date(msg.timestamp),
      };
      setMessages((prev) => [...prev, receivedMessage]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const base64ToBlobUrl = (base64: string): string => {
    const [mime, data] = base64.split(',');
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mime.split(':')[1].split(';')[0] });
    return URL.createObjectURL(blob);
  };

  const sendMessage = async () => {
    if ((input.trim() || file) && socket) {
      let content = input;
      let type: MessageType = 'text';
      if (file) {
        content = await fileToBase64(file);
        if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type.startsWith('image/')) type = 'image';
        else type = 'text';
      }
      const newMessage: Message = {
        id: Date.now().toString(),
        type,
        content,
        timestamp: new Date(),
      };
      socket.emit('message', newMessage);
      setInput('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const renderMessage = (message: Message) => {
    if (message.type === 'text') {
      return <p>{message.content}</p>;
    } else if (message.type === 'video') {
      return <video controls src={base64ToBlobUrl(message.content)} className="max-w-full h-auto" />;
    } else if (message.type === 'audio') {
      return <audio controls src={base64ToBlobUrl(message.content)} className="w-full" />;
    } else if (message.type === 'image') {
      return <img src={base64ToBlobUrl(message.content)} alt="Image" className="max-w-full h-auto" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-500 text-white p-4 text-center">
        <h1 className="text-2xl font-bold">Chat App</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-white p-3 rounded-lg shadow">
            {renderMessage(msg)}
            <small className="text-gray-500">{msg.timestamp.toLocaleTimeString()}</small>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <input
            type="file"
            accept="video/*,audio/*,image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="bg-gray-200 p-2 rounded cursor-pointer">
            📎
          </label>
          <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded">
            Send
          </button>
        </div>
        {file && <p className="text-sm text-gray-600 mt-2">Selected: {file.name}</p>}
      </div>
    </div>
  );
}
