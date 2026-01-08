import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstname: '',
    lastname: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/user/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        fullname: {
          firstname: formData.firstname,
          lastname: formData.lastname,
        },
      };

      const response = await api.register(userData);
      localStorage.removeItem('token');
      localStorage.removeItem('captain_token');
      localStorage.setItem('token', response.token);
      window.dispatchEvent(new Event('tokenChange'));
      await new Promise(resolve => setTimeout(resolve, 50));
      navigate('/user/dashboard', { replace: true });
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((errorItem) => {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: errorItem.msg || errorItem.message || errorMessage,
          });
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-black text-white">

      {/* Left Side - Image and Form (Mobile: vertical, Desktop: side by side) */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Top Image */}
        <div className="w-full flex justify-center items-center p-4 lg:p-6">
          <img 
            src="https://tb-static.uber.com/prod/udam-assets/3b852d0c-6d5b-427f-bd3a-84c4d98d5a5d.png" 
            alt="user" 
            className="w-full max-w-[200px] lg:max-w-[250px] h-auto object-contain rounded-lg"
          />
        </div>

        {/* Form Section */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Welcome Text */}
            <div className="mb-6">
              <h1 className="text-white text-3xl font-bold">Create your account</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstname" className="block text-base font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    id="firstname"
                    name="firstname"
                    type="text"
                    placeholder="John"
                    value={formData.firstname}
                    onChange={handleChange}
                    required
                    minLength={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="lastname" className="block text-base font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastname"
                    name="lastname"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastname}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-base font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-base font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className='flex justify-center pt-2'>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-3/4 bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-white">
                Already have an account?{' '}
                <Link to="/user/signin" className="text-white font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Section (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-black items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800"></div>
        <div className="relative z-10 text-white text-center max-w-lg">
          <h2 className="text-5xl font-bold mb-6">Go anywhere with Uber</h2>
          <p className="text-xl text-gray-300">Request a ride, hop in, and go.</p>
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold">100M+</div>
              <div className="text-sm text-gray-400 mt-2">Riders</div>
            </div>
            <div>
              <div className="text-4xl font-bold">10K+</div>
              <div className="text-sm text-gray-400 mt-2">Cities</div>
            </div>
            <div>
              <div className="text-4xl font-bold">15B+</div>
              <div className="text-sm text-gray-400 mt-2">Trips</div>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}

export default SignUp;

