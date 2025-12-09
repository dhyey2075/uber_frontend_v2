import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '../components/ui/use-toast.jsx';
import { BACKGROUND_IMAGE_URL } from '../config/background';

function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstname: '',
    lastname: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
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
      // Clear any old tokens first
      localStorage.removeItem('token');
      localStorage.removeItem('captain_token');
      // Set new token
      localStorage.setItem('token', response.token);
      // Dispatch event to notify App of token change
      window.dispatchEvent(new Event('tokenChange'));
      // Small delay to ensure token is set and event is processed
      await new Promise(resolve => setTimeout(resolve, 50));
      // Force navigation with replace to clear history
      navigate('/user/dashboard', { replace: true });
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      
      // Show toast for 400 errors with validation errors
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

  const backgroundStyle = BACKGROUND_IMAGE_URL 
    ? {
        backgroundImage: `url(${BACKGROUND_IMAGE_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      };

  return (
    <div 
      className="flex justify-center items-center min-h-screen p-2 sm:p-4 md:p-5 relative overflow-hidden"
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black/20 sm:bg-black/30"></div>
      <Card className="w-full max-w-md relative z-10 border-0 sm:border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl sm:text-3xl text-center text-white font-bold">Sign Up</CardTitle>
          <CardDescription className="text-center text-white/90">
            Create a new account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm text-center border border-destructive/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="firstname">First Name</Label>
              <Input
                id="firstname"
                name="firstname"
                type="text"
                placeholder="Enter your first name"
                value={formData.firstname}
                onChange={handleChange}
                required
                minLength={3}
                className="h-10 sm:h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastname">Last Name</Label>
              <Input
                id="lastname"
                name="lastname"
                type="text"
                placeholder="Enter your last name"
                value={formData.lastname}
                onChange={handleChange}
                className="h-10 sm:h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-10 sm:h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="h-10 sm:h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 sm:h-11"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-white/90">
            Already have an account?{' '}
            <Link to="/user/signin" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SignUp;

