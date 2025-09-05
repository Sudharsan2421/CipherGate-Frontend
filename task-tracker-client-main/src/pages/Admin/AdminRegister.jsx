import { useState } from 'react';

const AdminAuth = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', subdomain: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isLoading, setIsLoading] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    setMessage('');
  };

  const handleSubdomainChange = (e) => {
    const { value } = e.target;
    const formattedValue = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, subdomain: formattedValue }));

    // Simulating domain check
    const isAvailable = !['test', 'admin', 'root'].includes(formattedValue);
    setDomainAvailable(isAvailable);

    if (!isAvailable) {
      setMessage('This company name is not available.');
      setMessageType('error');
    } else if (formattedValue.length < 5) {
      setMessage('Company name must be at least 5 characters.');
      setMessageType('error');
    } else {
      setMessage('');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      return;
    }

    if (formData.subdomain.length < 5 || !domainAvailable) {
      setMessage('Please enter a valid and available company name.');
      setMessageType('error');
      return;
    }
    
    setIsLoading(true);

    try {
      // Simulate API call to register
      // In a real app, you would make a POST request to your backend here
      const response = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });

      if (response.success) {
        setMessage('Registration successful! Please log in.');
        setMessageType('success');
        setIsRegistered(true);
      } else {
        setMessage('Registration failed. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('An error occurred during registration.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call to login
      // In a real app, you would make a POST request to your backend here
      const response = await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (formData.username === 'testuser' && formData.password === 'password123') {
            resolve({ success: true });
          } else {
            reject(new Error('Invalid username or password.'));
          }
        }, 1000);
      });

      if (response.success) {
        setMessage('Login successful!');
        setMessageType('success');
        setIsLoggedIn(true);
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const FaLinkSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.178-1.179m-1.178-5.656l1.178 1.178a4 4 0 105.656-5.656l-4-4a4 4 0 10-5.656 0" />
    </svg>
  );

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
          <div className="relative">
            <label className="block text-gray-300">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white pr-10"
              placeholder="Enter password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
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
            <label className="block text-gray-300">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter email"
            />
          </div>
          <div>
            <label className="block text-gray-300">Company Name</label>
            <input
              type="text"
              name="subdomain"
              value={formData.subdomain}
              onChange={handleSubdomainChange}
              required
              className={`w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border ${domainAvailable ? 'border-[#2a3260]' : 'border-red-500'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}
              placeholder="Enter company name"
            />
          </div>
          <div className="relative">
            <label className="block text-gray-300">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white pr-10"
              placeholder="Enter password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          <div className="relative">
            <label className="block text-gray-300">Confirm Password</label>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              className="w-full px-4 py-3 mt-2 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white pr-10"
              placeholder="Confirm password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registering...' : 'Register'}
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
