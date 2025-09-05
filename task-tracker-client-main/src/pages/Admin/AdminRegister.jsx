import { useState } from 'react';

const AdminAuth = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const registeredUsers = [
    { username: 'admin', password: 'password123' },
    { username: 'testuser', password: 'testpassword' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (registeredUsers.some(user => user.username === formData.username)) {
      setMessage('User already exists.');
      setMessageType('error');
    } else {
      registeredUsers.push({ username: formData.username, password: formData.password });
      setMessage('Registration successful! Please log in.');
      setMessageType('success');
      setIsRegistered(true);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const user = registeredUsers.find(
      (u) => u.username === formData.username && u.password === formData.password
    );

    if (user) {
      setMessage('Login successful!');
      setMessageType('success');
      setIsLoggedIn(true);
    } else {
      setMessage('Invalid username or password.');
      setMessageType('error');
    }
  };

  const renderAuthForm = () => {
    if (isRegistered) {
      return (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-center text-lg sm:text-xl font-bold mb-4">
            <h2 className="text-white">Admin Login</h2>
          </div>
          {message && (
            <div className={`p-3 rounded-lg text-sm text-center ${messageType === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {message}
            </div>
          )}
          <div>
            <label className="block text-gray-300">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-gray-300">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4"
          >
            Login
          </button>
          <p className="mt-4 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={() => setIsRegistered(false)} 
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign Up
            </button>
          </p>
        </form>
      );
    } else {
      return (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="text-center text-lg sm:text-xl font-bold mb-4">
            <h2 className="text-white">Admin Register</h2>
          </div>
          {message && (
            <div className={`p-3 rounded-lg text-sm text-center ${messageType === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {message}
            </div>
          )}
          <div>
            <label className="block text-gray-300">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-gray-300">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4"
          >
            Register
          </button>
          <p className="mt-4 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <button 
              type="button" 
              onClick={() => setIsRegistered(true)} 
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign In
            </button>
          </p>
        </form>
      );
    }
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1020] to-[#1a1a2e] text-white p-4">
        <div className="w-[85%] max-w-md z-10 bg-[#121630]/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-[#2a3260] text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-600">
            Welcome, {formData.username}!
          </h1>
          <p className="mt-4 text-gray-300">You have successfully logged in.</p>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="mt-6 py-2 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1020] to-[#1a1a2e] text-white p-4">
      <div className="w-[85%] max-w-md z-10 bg-[#121630]/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-[#2a3260]">
        {renderAuthForm()}
      </div>
    </div>
  );
};

export default AdminAuth;
