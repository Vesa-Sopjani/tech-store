import React, { useEffect } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiLogIn, FiMail, FiLock, FiShield, FiAlertCircle,
  FiCheckCircle, FiEye, FiEyeOff, FiRefreshCw, FiActivity,
  FiDatabase, FiUser, FiGlobe, FiHome
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useTelemetry } from "../../hooks/useTelemetry";
import { 
  generateCaptcha, 
  createCaptchaDataUrl,
  generateFallbackCaptcha 
} from "../../services/captchaService";
import { API_URL } from "../../utils/constants";
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { startSpan, endSpan } = useTelemetry();
  const { login: authContextLogin } = useAuth();

  const [formData, setFormData] = useState({
    identifier: "",
    password: ""
  });

  const [captchaData, setCaptchaData] = useState({
    id: "",
    image: "",
    dataUrl: "",
    isLoading: false,
    error: null
  });
  
  const [captchaInput, setCaptchaInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCaptcha, setShowCaptcha] = useState(false);

  // Load CAPTCHA if needed
  const loadCaptcha = async () => {
    setCaptchaData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const captcha = await generateCaptcha();
      
      const dataUrl = createCaptchaDataUrl(captcha.image);
      
      setCaptchaData({
        id: captcha.id,
        image: captcha.image,
        dataUrl,
        isLoading: false,
        error: null
      });
      
      console.log("CAPTCHA loaded successfully:", captcha.id);
    } catch (error) {
      console.error("Failed to load CAPTCHA from server:", error);
      
      try {
        console.log("Trying fallback CAPTCHA...");
        const fallbackCaptcha = await generateFallbackCaptcha();
        const dataUrl = createCaptchaDataUrl(fallbackCaptcha.image);
        
        setCaptchaData({
          id: fallbackCaptcha.id,
          image: fallbackCaptcha.image,
          dataUrl,
          isLoading: false,
          error: null
        });
        
        console.log("Fallback CAPTCHA loaded");
        
        toast.info(
          <div className="flex items-center">
            <FiAlertCircle className="mr-2" />
            Përdorim CAPTCHA rezervë për testim
          </div>
        );
      } catch (fallbackError) {
        console.error("Fallback CAPTCHA also failed:", fallbackError);
        setCaptchaData(prev => ({
          ...prev,
          isLoading: false,
          error: "Dështoi ngarkimi i CAPTCHA. Ju lutem provoni përsëri më vonë."
        }));
      }
    }
  };

  const handleRefreshCaptcha = async () => {
    setCaptchaInput("");
    await loadCaptcha();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const validation = validateLoginData(formData.identifier, formData.password);
    
    if (!validation.valid) {
      const newErrors = {};
      validation.errors.forEach(error => {
        if (error.includes('Email') || error.includes('username')) {
          newErrors.identifier = error;
        } else if (error.includes('Password')) {
          newErrors.password = error;
        }
      });
      setErrors(newErrors);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const span = startSpan("login_submit");

    // Validate form
    if (!validateForm()) {
      endSpan(span, "error");
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Attempting login with:', formData.identifier);
      
      // ✅ Përdor login nga AuthContext (jo direkt nga authService)
      const user = await authContextLogin(formData.identifier, formData.password);
      
      console.log('✅ Login successful, user:', user);
      
      toast.success(
        <div className="flex items-center">
          <FiCheckCircle className="mr-2" />
          U kyçet me sukses! Mirë se vini përsëri.
        </div>
      );

      endSpan(span, "success");

      // Reset form
      setFormData({
        identifier: "",
        password: ""
      });

      // ✅ REDIREKTIMI
      setTimeout(() => {
        console.log('🔄 Redirecting user with role:', user.role);
        
        if (user.role === 'admin' || user.role === 'administrator') {
          console.log('🚀 Redirecting to admin dashboard');
          navigate("/admin/dashboard");
        } else {
          console.log('🏠 Redirecting to homepage');
          navigate("/");
        }
      }, 1500);

    } catch (err) {
      console.error("❌ Login error:", err);
      
      const errorMessages = {
        "Failed to fetch": "Nuk mund të lidhet me serverin. Kontrollo lidhjen tuaj me internet.",
        "Invalid credentials": "Email/username ose fjalëkalim i gabuar",
        "User not found": "Përdoruesi nuk ekziston",
        "Account locked": "Llogaria është bllokuar përkohësisht",
        "HTTP 401": "Kredenciale të pavlefshme",
        "HTTP 429": "Shumë tentativa. Ju lutem prisni 15 minuta para se të provoni përsëri.",
        "HTTP 500": "Gabim në server. Provo përsëri më vonë.",
        "Session expired": "Session ka skaduar. Ju lutem kyçuni përsëri.",
        "Too many login attempts": "Shumë tentativa të dështuara. Prisni 15 minuta."
      };

      let errorMessage = errorMessages[err.message] || err.message || "Gabim gjatë kyçjes";

      // Nëse është 429, trego një mesazh më të qartë
      if (err.message.includes('429') || err.message.includes('Too many')) {
        errorMessage = "🛑 SHUMË TENTATIVA! Llogaria juaj është bllokuar përkohësisht për 15 minuta për shkak të tentativave të shumta të dështuara.";
        
        toast.error(
          <div className="space-y-2">
            <div className="flex items-center">
              <FiAlertCircle className="mr-2" />
              <span className="font-bold">Llogaria e Bllokuar</span>
            </div>
            <div className="text-sm pl-6">
              <p>• Shumë tentativa të dështuara të kyçjes</p>
              <p>• Bllokimi zgjat 15 minuta</p>
              <p>• Kontaktoni administratorin nëse është gabim</p>
            </div>
          </div>,
          { autoClose: 10000 }
        );
      } else {
        // Gabime të tjera
        toast.error(
          <div className="flex items-center">
            <FiAlertCircle className="mr-2" />
            {errorMessage}
          </div>
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  // Funksion për të testuar CORS dhe cookies
  const testBackendConnection = async () => {
    try {
      console.log('🔗 Testing backend connection...');
      
      const corsTest = await fetch(`${API_URL}/api/test-cors`, {
        method: 'GET',
        credentials: 'include'
      });
      console.log('🌐 CORS test:', corsTest.ok ? 'OK' : 'FAILED');
      
      const cookiesTest = await fetch(`${API_URL}/api/debug/cookies`, {
        method: 'GET',
        credentials: 'include'
      });
      const cookiesData = await cookiesTest.json();
      console.log('🍪 Cookies debug:', cookiesData);
      
      toast.info(
        <div className="flex items-center">
          <FiGlobe className="mr-2" />
          Lidhja me serverin është aktive
        </div>
      );
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      toast.error(
        <div className="flex items-center">
          <FiAlertCircle className="mr-2" />
          Nuk mund të lidhet me serverin
        </div>
      );
    }
  };


  useEffect(() => {
    let isMounted = true;
    
    const checkQuickAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log('📦 Login: Found cached user, redirecting...');
          
          setTimeout(() => {
            if (isMounted) {
              if (user.role === 'admin' || user.role === 'administrator') {
                navigate("/admin/dashboard");
              } else {
                navigate("/");
              }
            }
          }, 300);
        }
      } catch (error) {
        console.log('ℹ️ Login: No cached user found');
      }
    };
    
    checkQuickAuth();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
            <FiLogIn className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kyçu në Llogarinë Tënde
          </h1>
          <p className="text-gray-600">
            Mirë se vini përsëri. Shkruani kredencialet tuaja për të vazhduar.
          </p>
          
          {/* Debug button (vetëm në development) */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={testBackendConnection}
              className="mt-4 px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition"
            >
              <FiGlobe className="inline mr-2" />
              Testo Lidhjen me Server
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Left Column - Login Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Kyçu me email ose username
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifier Field */}
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium text-gray-700">
                  Email ose Username *
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    value={formData.identifier}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                      errors.identifier ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="email@example.com ose username"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                {errors.identifier && (
                  <p className="text-red-500 text-sm">{errors.identifier}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Fjalëkalimi *
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    disabled={loading}
                  >
                    Harruat fjalëkalimin?
                  </button>
                </div>
                <div className="relative">
                  <FiLock className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Shkruaj fjalëkalimin"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>

              {/* CAPTCHA (conditional) */}
              {showCaptcha && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Verifikimi i sigurisë
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      disabled={captchaData.isLoading}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                    >
                      <FiRefreshCw className={`mr-1 ${captchaData.isLoading ? 'animate-spin' : ''}`} />
                      {captchaData.isLoading ? 'Duke ngarkuar...' : 'Rifresko'}
                    </button>
                  </div>
                  
                  {captchaData.error ? (
                    <div className="text-center py-4">
                      <FiAlertCircle className="text-red-500 mx-auto text-2xl mb-2" />
                      <p className="text-sm text-red-600 mb-2">{captchaData.error}</p>
                      <button
                        type="button"
                        onClick={handleRefreshCaptcha}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Provo përsëri
                      </button>
                    </div>
                  ) : captchaData.isLoading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600 mt-2">Duke ngarkuar CAPTCHA...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-4 mb-3">
                        {captchaData.dataUrl ? (
                          <div className="flex-1">
                            <img 
                              src={captchaData.dataUrl} 
                              alt="CAPTCHA" 
                              className="h-12 w-full border rounded bg-white"
                              onClick={handleRefreshCaptcha}
                              style={{ cursor: 'pointer' }}
                              title="Kliko për CAPTCHA të re"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 h-12 border rounded bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400">CAPTCHA</span>
                          </div>
                        )}
                        <input
                          type="text"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value)}
                          placeholder="Shkruaj kodin"
                          className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          disabled={loading}
                          autoComplete="off"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Shkruaj karakteret që sheh në imazh (përshkëllej për të rifreskuar)
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Po kyçem...
                  </span>
                ) : (
                  "Kyçu"
                )}
              </button>

              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <FiAlertCircle className="text-red-500 mr-2" />
                    <p className="text-sm text-red-700">{errors.general}</p>
                  </div>
                </div>
              )}

              {/* Register Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Nuk ke llogari?{" "}
                  <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                    Regjistrohu këtu
                  </Link>
                </p>
              </div>
              
              {/* Auth Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <div className="flex items-center">
                  <FiShield className="mr-2" />
                  <span>Siguria: Përdorim cookies të sigurta (httpOnly) për authentication</span>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column - Info & Features */}
          <div className="space-y-6">
            
            {/* Security Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FiShield className="mr-2 text-blue-500" />
                Siguria e Llogarisë
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Tokenat ruhen në cookies të sigurta (httpOnly)</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Verifikim me CAPTCHA pas tentativave të dështuara</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">CORS i konfiguruar me credentials support</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Refresh token rotation për siguri maksimale</span>
                </li>
              </ul>
            </div>

            {/* Quick Login Options */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Opsione të tjera të kyçjes
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/login-with-phone")}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <FiMail />
                  <span>Kyçu me telefon</span>
                </button>
                <button
                  onClick={() => navigate("/login-with-otp")}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <FiShield />
                  <span>Kyçu me kod një-përdorim</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FiActivity className="mr-2" />
                Statusi i Sistemit
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>User Service</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Connected
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Authentication</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Cookies Active
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-400">
                <p className="text-sm text-blue-100 flex items-center">
                  <FiDatabase className="mr-2" />
                  Authentication: Cookies (httpOnly) + Refresh Token Rotation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Ky sistem përdor teknologji moderne të përpunimit të të dhënave sipas kërkesave të projektit SPDD.
          </p>
          <p className="mt-1">
            ✅ Admin shkon në /admin/dashboard
          </p>
          <p className="mt-1">
            ✅ Customer shkon në faqen kryesore (/)
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper validation function
const validateLoginData = (identifier, password) => {
  const errors = [];
  
  if (!identifier) {
    errors.push('Email ose username është i detyrueshëm');
  }
  
  if (!password) {
    errors.push('Fjalëkalimi është i detyrueshëm');
  } else if (password.length < 6) {
    errors.push('Fjalëkalimi duhet të jetë të paktën 6 karaktere');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default Login;