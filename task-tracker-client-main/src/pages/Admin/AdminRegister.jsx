import { useState, useEffect } from 'react';
// Note: `react-router-dom`, `react-toastify` and `framer-motion` are external libraries
// and cannot be used in a single, self-contained file.
// So, we will replace their functionality with local state and styling.

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    username: '',
    subdomain: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Instead of an external library for icons, we use an inline SVG.
  const FaLinkSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.178-1.179m-1.178-5.656l1.178 1.178a4 4 0 105.656-5.656l-4-4a4 4 0 10-5.656 0" />
    </svg>
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMessage(''); // Clear message on input change
  };

  const handleSubdomainChange = async (e) => {
    const { name, value } = e.target;
    const formattedValue = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    if (formattedValue.length < 5) {
      setDomainAvailable(false);
      return;
    }

    // `subdomainAvailable` API-ku badhilaga, oru `promise`-a use pannurom.
    // (Instead of the `subdomainAvailable` API, we use a simulated promise).
    const subdomainAvailableSimulation = (subdomain) => new Promise((resolve) => {
      setTimeout(() => {
        const takenSubdomains = ['admin', 'test', 'invalid', 'mycompany'];
        const isAvailable = !takenSubdomains.includes(subdomain.toLowerCase());
        resolve({ available: isAvailable, message: isAvailable ? 'Subdomain is available.' : 'This company name is not available or too short.' });
      }, 500); // 500ms delay to simulate network latency
    });

    try {
      const res = await subdomainAvailableSimulation(formattedValue);
      setDomainAvailable(res.available);
      if (!res.available) {
        setMessage(res.message);
        setMessageType('error');
      } else {
        setMessage('Subdomain is available.');
        setMessageType('success');
      }
    } catch (error) {
      setMessage('Error checking subdomain availability.');
      setMessageType('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }
    
    if (formData.subdomain.length < 5 || !domainAvailable) {
        setMessage('Please provide a valid company name.');
        setMessageType('error');
        return;
    }

    setIsLoading(true);
    
    // `registerAdmin` API-ku badhilaga, oru `promise`-a use pannurom.
    // (Instead of the `registerAdmin` API, we use a simulated promise).
    const registerAdminSimulation = () => new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simple success/failure logic based on a condition
        if (formData.username && formData.email) {
          resolve({ message: 'Registration successful!' });
        } else {
          reject({ message: 'Registration failed.' });
        }
      }, 1000); // 1000ms delay to simulate network latency
    });

    try {
      await registerAdminSimulation();
      setMessage('Registration successful! Please login.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Registration failed');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1020] to-[#1a1a2e] text-white relative">
      <div className="w-[85%] max-w-md z-10 bg-[#121630]/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-[#2a3260] mx-auto my-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Create Admin Account
          </h1>
          <div className="h-1 bg-blue-500 rounded-full w-20 mx-auto mt-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm text-center ${messageType === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
              {message}
            </div>
          )}

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username" className="text-gray-300 flex items-center text-sm font-medium mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="w-full px-4 py-3 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>

          {/* Subdomain Field */}
          <div className="form-group">
            <label htmlFor="subdomain" className="text-gray-300 flex items-center text-sm font-medium mb-2">
              <FaLinkSVG />
              Company name
            </label>
            <input
              type="text"
              id="subdomain"
              name="subdomain"
              className={`w-full px-4 py-3 bg-[#1d2451]/50 border ${domainAvailable ? 'border-[#2a3260]' : 'border-red-500'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white`}
              value={formData.subdomain}
              onChange={handleSubdomainChange}
              required
              placeholder="Enter your company name"
            />
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email" className="text-gray-300 flex items-center text-sm font-medium mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full px-4 py-3 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          {/* Password Field */}
          <div className="form-group relative">
            <label htmlFor="password" className="text-gray-300 flex items-center text-sm font-medium mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="w-full px-4 py-3 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white pr-10"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                placeholder="Enter your password"
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
          </div>

          {/* Confirm Password Field */}
          <div className="form-group relative">
            <label htmlFor="confirmPassword" className="text-gray-300 flex items-center text-sm font-medium mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                className="w-full px-4 py-3 bg-[#1d2451]/50 border border-[#2a3260] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white pr-10"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength="6"
                placeholder="Confirm your password"
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !domainAvailable}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{' '}
          {/* We replace `Link` from `react-router-dom` with a simple anchor tag or styled div since routing isn't available here. */}
          <a 
            href="/admin/login" 
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;
