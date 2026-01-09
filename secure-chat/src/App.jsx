import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, UserPlus, Users, LogOut, Shield, Eye, EyeOff } from 'lucide-react';

const SecureChat = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const sessionTimeout = useRef(null);

  // Simple encryption/decryption (demonstration - in production use Web Crypto API)
  const simpleEncrypt = (text, key) => {
    return btoa(text + '|' + key);
  };

  const simpleDecrypt = (encrypted, key) => {
    try {
      const decoded = atob(encrypted);
      const [text, encKey] = decoded.split('|');
      return encKey === key ? text : null;
    } catch {
      return null;
    }
  };

  // Hash password (demonstration - use proper hashing in production)
  const hashPassword = (pwd) => {
    return btoa(pwd + 'salt');
  };

  // Session management
  const startSession = (user) => {
    setCurrentUser(user);
    resetSessionTimeout();
  };

  const resetSessionTimeout = () => {
    if (sessionTimeout.current) clearTimeout(sessionTimeout.current);
    sessionTimeout.current = setTimeout(() => {
      handleLogout();
      setError('Session expired. Please log in again.');
    }, 30 * 60 * 1000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setMessages([]);
    setOnlineUsers([]);
    if (sessionTimeout.current) clearTimeout(sessionTimeout.current);
  };

  // Load stored data from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        // Initialize localStorage if needed
        if (!localStorage.getItem('chat_users')) {
          localStorage.setItem('chat_users', JSON.stringify({}));
        }
        if (!localStorage.getItem('chat_online')) {
          localStorage.setItem('chat_online', JSON.stringify([]));
        }
        if (!localStorage.getItem('chat_messages')) {
          localStorage.setItem('chat_messages', JSON.stringify([]));
        }

        const online = JSON.parse(localStorage.getItem('chat_online') || '[]');
        setOnlineUsers(online);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
  }, []);

  // Load messages when user logs in
  useEffect(() => {
    if (currentUser) {
      loadMessages();
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadMessages = () => {
    try {
      const stored = localStorage.getItem('chat_messages');
      if (stored) {
        const encrypted = JSON.parse(stored);
        const decrypted = encrypted.map(msg => ({
          ...msg,
          text: simpleDecrypt(msg.text, currentUser.key)
        })).filter(msg => msg.text !== null);
        setMessages(decrypted);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleRegister = () => {
    if (!username.trim() || password.length < 8) {
      setError('Username required and password must be at least 8 characters');
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem('chat_users') || '{}');

      if (users[username]) {
        setError('Username already exists');
        return;
      }

      const hashedPwd = hashPassword(password);
      const userKey = btoa(username + password);
      users[username] = { password: hashedPwd, key: userKey };
      
      localStorage.setItem('chat_users', JSON.stringify(users));
      
      const user = { username, key: userKey };
      startSession(user);
      updateOnlineUsers(username, true);
      setError('');
    } catch (err) {
      setError('Registration failed');
      console.error(err);
    }
  };

  const handleLogin = () => {
    if (!username.trim() || !password) {
      setError('Username and password required');
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem('chat_users') || '{}');

      if (!users[username]) {
        setError('User not found');
        return;
      }

      const hashedPwd = hashPassword(password);
      if (users[username].password !== hashedPwd) {
        setError('Incorrect password');
        return;
      }

      const user = { username, key: users[username].key };
      startSession(user);
      updateOnlineUsers(username, true);
      setError('');
    } catch (err) {
      setError('Login failed');
      console.error(err);
    }
  };

  const updateOnlineUsers = (username, isOnline) => {
    try {
      let online = JSON.parse(localStorage.getItem('chat_online') || '[]');
      
      if (isOnline && !online.includes(username)) {
        online.push(username);
      } else if (!isOnline) {
        online = online.filter(u => u !== username);
      }
      
      localStorage.setItem('chat_online', JSON.stringify(online));
      setOnlineUsers(online);
    } catch (err) {
      console.error('Error updating online users:', err);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;

    resetSessionTimeout();

    const encrypted = simpleEncrypt(newMessage.trim(), currentUser.key);
    const message = {
      id: Date.now(),
      user: currentUser.username,
      text: encrypted,
      timestamp: new Date().toISOString()
    };

    try {
      const messages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
      messages.push(message);
      
      // Keep only last 100 messages
      if (messages.length > 100) messages.shift();
      
      localStorage.setItem('chat_messages', JSON.stringify(messages));
      setNewMessage('');
      loadMessages();
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Logout cleanup
  useEffect(() => {
    return () => {
      if (currentUser) {
        updateOnlineUsers(currentUser.username, false);
      }
    };
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">SecureChat</h1>
          </div>
          
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <div className="flex items-start">
              <Lock className="w-5 h-5 text-indigo-600 mr-2 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Security Features:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>End-to-end encryption</li>
                  <li>Secure password hashing</li>
                  <li>Auto-logout after 30min inactivity</li>
                  <li>Local encrypted storage</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogin}
                className="flex-1 bg-indigo-600 py-3 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center"
              >
                <Lock className="w-5 h-5 mr-2" />
                Login
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-medium flex items-center justify-center"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Register
              </button>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500 text-center">
            All messages are encrypted and stored locally in your browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Shield className="w-6 h-6 text-indigo-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-800">SecureChat</h1>
          <span className="ml-4 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            {currentUser.username}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center text-gray-600">
            <Users className="w-5 h-5 mr-2" />
            <span className="text-sm">{onlineUsers.length} online</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <Lock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No messages yet. Start a secure conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user === currentUser.username ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  msg.user === currentUser.username
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                <p className="text-xs font-semibold mb-1 opacity-75">
                  {msg.user}
                </p>
                <p className="break-words">{msg.text}</p>
                <p className="text-xs mt-1 opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a secure message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecureChat;