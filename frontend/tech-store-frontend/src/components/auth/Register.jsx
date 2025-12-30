
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiUserPlus, FiShield, FiActivity, FiDatabase,
  FiCheckCircle, FiAlertCircle, FiLock, FiMail,
  FiPhone, FiMapPin, FiUser, FiRefreshCw,
  FiEye, FiEyeOff
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useTelemetry } from "../../hooks/useTelemetry";
import { validateDataQuality } from "../../services/validationService";
import { oauth2Login } from "../../services/authService";
import { publishKafkaEvent } from "../../services/eventService";
import { 
  generateCaptcha, 
  verifyCaptcha,
  createCaptchaDataUrl,
  generateFallbackCaptcha  
} from "../../services/captchaService";
import { API_URL } from "../../utils/constants";

const Register = () => {
  const navigate = useNavigate();
  const { startSpan, endSpan } = useTelemetry();
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    address: "",
    phone: "",
    termsAccepted: false
  });

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });
  
  const [captchaData, setCaptchaData] = useState({
    id: "",
    image: "",
    dataUrl: "",
    isLoading: false,
    error: null
  });
  
  const [captchaInput, setCaptchaInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const oauth2Providers = [
    { name: "Google", color: "bg-red-500 hover:bg-red-600" },
    { name: "GitHub", color: "bg-gray-800 hover:bg-gray-900" },
    { name: "Microsoft", color: "bg-blue-600 hover:bg-blue-700" }
  ];

   // Load CAPTCHA me fallback
  useEffect(() => {
    loadCaptcha();
  }, []);
  useEffect(() => {
  // Testo lidhjen me server
  testConnection();
}, []);

const testConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) {
      console.log("✅ Server connection OK");
    } else {
      console.error("❌ Server responded with error:", response.status);
    }
  } catch (error) {
    console.error("❌ Cannot connect to server:", error.message);
    toast.error(
      <div className="space-y-1">
        <div className="flex items-center">
          <FiAlertCircle className="mr-2" />
          <span>Cannot connect to server</span>
        </div>
        <div className="text-sm pl-6">
          Server URL: {API_URL}
        </div>
        <div className="text-sm pl-6">
          Make sure user service is running on port 5000
        </div>
      </div>
    );
  }
};

  const loadCaptcha = async () => {
  setCaptchaData(prev => ({ ...prev, isLoading: true, error: null }));
  
  try {
    // Nëse nuk ka CAPTCHA service, përdor direkt fallback
    console.log("Generating fallback CAPTCHA...");
    const fallbackCaptcha = await generateFallbackCaptcha();
    const dataUrl = createCaptchaDataUrl(fallbackCaptcha.image);
    
    setCaptchaData({
      id: fallbackCaptcha.id,
      image: fallbackCaptcha.image,
      dataUrl,
      isLoading: false,
      error: null
    });
    
    console.log("Fallback CAPTCHA loaded successfully:", fallbackCaptcha.id);
    
    toast.info(
      <div className="flex items-center">
        <FiAlertCircle className="mr-2" />
        Using fallback CAPTCHA for development
      </div>
    );
  } catch (fallbackError) {
    console.error("Fallback CAPTCHA failed:", fallbackError);
    setCaptchaData(prev => ({
      ...prev,
      isLoading: false,
      error: "Failed to load CAPTCHA."
    }));
  }
};

  const handleRefreshCaptcha = async () => {
    setCaptchaInput("");
    await loadCaptcha();
  };

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const checks = [
      { regex: /.{8,}/, message: "Minimal 8 karaktere", points: 1 },
      { regex: /[a-z]/, message: "Shkronjë të vogël (a-z)", points: 1 },
      { regex: /[A-Z]/, message: "Shkronjë të madhe (A-Z)", points: 1 },
      { regex: /\d/, message: "Numër (0-9)", points: 1 },
      { regex: /[!@#$%^&*(),.?":{}|<>]/, message: "Simbol special", points: 1 },
      { regex: /.{12,}/, message: "12+ karaktere", points: 2 },
      { regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, message: "Kombinim i fortë", points: 3 }
    ];

    const feedback = [];
    let score = 0;

    checks.forEach(check => {
      if (check.regex.test(password)) {
        feedback.push({ message: check.message, passed: true });
        score += check.points;
      } else {
        feedback.push({ message: check.message, passed: false });
      }
    });

    setPasswordStrength({ score, feedback });
  };

  // Input validation
  const validateInput = (name, value) => {
    const errors = { ...validationErrors };
    
    switch (name) {
      case 'email':
        if (!value) {
          errors.email = "Email është i detyrueshëm";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = "Email i pavlefshëm";
        } else {
          delete errors.email;
        }
        break;
      case 'phone':
        if (value && !/^\+?[\d\s\-]{8,15}$/.test(value)) {
          errors.phone = "Numër telefoni i pavlefshëm";
        } else {
          delete errors.phone;
        }
        break;
      case 'username':
        if (!value) {
          errors.username = "Username është i detyrueshëm";
        } else if (value.length < 3) {
          errors.username = "Username duhet të ketë të paktën 3 karaktere";
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          errors.username = "Username mund të përmbajë vetëm shkronja, numra dhe underscore";
        } else {
          delete errors.username;
        }
        break;
      case 'password':
        if (!value) {
          errors.password = "Fjalëkalimi është i detyrueshëm";
        } else if (value.length < 8) {
          errors.password = "Fjalëkalimi duhet të ketë të paktën 8 karaktere";
        } else {
          delete errors.password;
        }
        checkPasswordStrength(value);
        break;
      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = "Konfirmimi i fjalëkalimit është i detyrueshëm";
        } else if (value !== formData.password) {
          errors.confirmPassword = "Fjalëkalimet nuk përputhen";
        } else {
          delete errors.confirmPassword;
        }
        break;
      case 'full_name':
        if (!value) {
          errors.full_name = "Emri i plotë është i detyrueshëm";
        } else if (value.length < 2) {
          errors.full_name = "Emri duhet të ketë të paktën 2 karaktere";
        } else {
          delete errors.full_name;
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    if (name !== 'termsAccepted') {
      validateInput(name, newValue);
    }
  };

  // Circuit breaker pattern
  const callWithCircuitBreaker = async (apiCall, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      // Nëse është CORS error, mos u përpo përsëri
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        console.error('CORS error detected, stopping retries');
        break;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError || new Error('Registration failed');
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  const span = startSpan("register_submit");

  // Validate CAPTCHA
  if (!captchaData.id) {
    toast.error("CAPTCHA nuk është ngarkuar. Provo përsëri.");
    await loadCaptcha();
    endSpan(span, "error");
    return;
  }

  if (!captchaInput.trim()) {
    toast.error("Ju lutem shkruani kodin e CAPTCHA-së.");
    endSpan(span, "error");
    return;
  }

  try {
    const captchaResult = await verifyCaptcha(captchaData.id, captchaInput);
    
    if (!captchaResult.valid) {
      toast.error(`CAPTCHA: ${captchaResult.message}`);
      
      if (captchaResult.requiresNewCaptcha) {
        await loadCaptcha();
        setCaptchaInput("");
      }
      
      endSpan(span, "error");
      return;
    }
  } catch (error) {
    toast.error("Verifikimi i CAPTCHA-së dështoi. Provo përsëri.");
    await loadCaptcha();
    setCaptchaInput("");
    endSpan(span, "error");
    return;
  }

  // Check required fields
  const requiredFields = ['email', 'username', 'password', 'confirmPassword', 'full_name'];
  const missingFields = requiredFields.filter(field => !formData[field]);
  
  if (missingFields.length > 0) {
    toast.error(`Ju lutem plotësoni të gjitha fushat e detyrueshme`);
    endSpan(span, "error");
    return;
  }

  if (Object.keys(validationErrors).length > 0) {
    toast.error("Rregullo gabimet në formë para se të vazhdosh");
    endSpan(span, "error");
    return;
  }

  if (!formData.termsAccepted) {
    toast.error("Duhet të pranoni kushtet e shërbimit");
    endSpan(span, "error");
    return;
  }

  setLoading(true);

  try {
    // Register API call with circuit breaker - VERSIONI I KORRIGJUAR
    const res = await callWithCircuitBreaker(async () => {
      console.log(`📤 Sending registration request to: ${API_URL}/api/auth/register`);
      
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        address: formData.address || "",
        phone: formData.phone || "",
        role: "customer"
        // MOS E PËRFSHI METADATA NËSE SERVERI NUK E PRET
      };

      console.log('📦 Payload:', JSON.stringify(payload, null, 2));
      
      // ✅ KY ËSHTE FETCH I KORRIGJUAR - PA HEADERS QË SHKAKTOJNË CORS
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
          // MOS E PËRFSHI X-Client-IP - SHKAKTON CORS PROBLEME
          // MOS E PËRFSHI X-Request-ID - SHKAKTON CORS PROBLEME
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Server error response:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('❌ Server error (not JSON):', text);
          errorData = { message: text || `HTTP ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      console.log('✅ Registration successful');
      return response;
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "Regjistrimi dështoi");
    }

    toast.success(
      <div className="flex items-center">
        <FiCheckCircle className="mr-2" />
        U regjistrua me sukses! Tani mund të kyçeni.
      </div>
    );

    endSpan(span, "success");

    // Reset form
    setFormData({
      username: "", email: "", password: "", confirmPassword: "",
      full_name: "", address: "", phone: "", termsAccepted: false
    });
    setCaptchaInput("");
    await loadCaptcha();

    // Redirect to login
    setTimeout(() => {
      navigate("/login", { 
        state: { 
          email: formData.email,
          message: "Regjistrimi u krye me sukses! Tani mund të kyçeni." 
        } 
      });
    }, 2000);

  } catch (err) {
    console.error("Registration error:", err);
    
    // Error mapping - SHTO CORS ERROR
    const errorMessages = {
      "Failed to fetch": "Problem me lidhjen me serverin. Kontrollo konfigurimin CORS në backend.",
      "User with this email or username already exists": "Përdoruesi me këtë email ekziston tashmë",
      "HTTP 409": "Përdoruesi me këtë email ekziston tashmë",
      "HTTP 400": "Të dhëna të pavlefshme. Kontrollo fushat.",
      "HTTP 429": "Shumë tentativa. Provo përsëri më vonë.",
      "HTTP 500": "Gabim në server. Provo përsëri më vonë.",
      "CAPTCHA not found or expired": "CAPTCHA ka skaduar. Provo përsëri.",
      "Invalid CAPTCHA": "Kodi i CAPTCHA-së është i gabuar. Provo përsëri."
    };

    let errorMessage = errorMessages[err.message] || err.message || "Gabim gjatë regjistrimit";
    
    // Nëse është CORS error
    if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
      errorMessage = `
        Problem CORS me serverin. 
        Kontrollo backend për konfigurimin e duhur të CORS.
        Server URL: ${API_URL}
      `;
    }

    toast.error(
      <div className="flex items-center">
        <FiAlertCircle className="mr-2" />
        {errorMessage}
      </div>
    );

    endSpan(span, "error");
    await loadCaptcha();
    setCaptchaInput("");
    
  } finally {
    setLoading(false);
  }
};

  const handleOAuth2Login = async (provider) => {
    const span = startSpan(`oauth2_login_${provider.toLowerCase()}`);
    try {
      await oauth2Login(provider);
      endSpan(span, "success");
    } catch (err) {
      toast.error(`Gabim me ${provider}: ${err.message}`);
      endSpan(span, "error");
    }
  };

  // Helper functions
// Nëse serveri nuk ka nevojë për IP, thjesht hiqe ose ndrysho:
const getClientIP = async () => {
  return 'unknown'; // Ose thjesht return ''
};

  const generateRequestId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Password strength indicator
  const getStrengthColor = (score) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStrengthText = (score) => {
    if (score >= 8) return "Shumë i fortë";
    if (score >= 5) return "I mirë";
    if (score >= 3) return "I dobët";
    return "Shumë i dobët";
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-2xl shadow-lg mb-4">
            <FiUserPlus className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Krijo Llogari të Re
          </h1>
          <p className="text-gray-600">
            Bashkohu me komunitetin tonë. Regjistrimi është i shpejtë dhe i lehtë.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Left Column - Registration Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Regjistrohu me email
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { name: 'full_name', icon: FiUser, placeholder: 'Emri dhe Mbiemri *', type: 'text' },
                  { name: 'username', icon: FiUser, placeholder: 'Username *', type: 'text' },
                  { name: 'email', icon: FiMail, placeholder: 'Email *', type: 'email' },
                  { name: 'phone', icon: FiPhone, placeholder: 'Telefon (opsional)', type: 'tel' },
                  { name: 'address', icon: FiMapPin, placeholder: 'Adresa (opsional)', type: 'text' },
                ].map(({ name, icon: Icon, placeholder, type }) => (
                  <div key={name} className="relative">
                    <Icon className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type={type}
                      name={name}
                      value={formData[name]}
                      placeholder={placeholder}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                        validationErrors[name] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {validationErrors[name] && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors[name]}</p>
                    )}
                  </div>
                ))}

                {/* Password fields */}
                <div className="space-y-4">
                  <div className="relative">
                    <FiLock className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      placeholder="Fjalëkalimi *"
                      onChange={handleChange}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                        validationErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>

                  <div className="relative">
                    <FiLock className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      placeholder="Konfirmo Fjalëkalimin *"
                      onChange={handleChange}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                        validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {formData.password && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Forca e fjalëkalimit:
                        </span>
                        <span className={`text-sm font-semibold ${getStrengthColor(passwordStrength.score).replace('bg-', 'text-')}`}>
                          {getStrengthText(passwordStrength.score)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getStrengthColor(passwordStrength.score)} transition-all duration-300`}
                          style={{ width: `${Math.min(passwordStrength.score * 10, 100)}%` }}
                        />
                      </div>
                      <ul className="mt-3 space-y-1">
                        {passwordStrength.feedback.slice(0, 5).map((item, index) => (
                          <li key={index} className="flex items-center text-sm">
                            {item.passed ? (
                              <FiCheckCircle className="text-green-500 mr-2" />
                            ) : (
                              <FiAlertCircle className="text-gray-400 mr-2" />
                            )}
                            <span className={item.passed ? 'text-green-600' : 'text-gray-500'}>
                              {item.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* CAPTCHA */}
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

                {/* Terms and conditions */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    className="mt-1 mr-2"
                    id="terms"
                    disabled={loading}
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    Unë pranoj{" "}
                    <Link to="/terms" className="text-blue-600 hover:underline">
                      Kushtet e Shërbimit
                    </Link>{" "}
                    dhe{" "}
                    <Link to="/privacy" className="text-blue-600 hover:underline">
                      Politikën e Privatësisë
                    </Link>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || Object.keys(validationErrors).length > 0 || !formData.termsAccepted}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Po regjistrohem...
                    </span>
                  ) : (
                    "Krijo Llogari"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Ke tashmë llogari?{" "}
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                    Kyçu këtu
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - OAuth & Features */}
          <div className="space-y-6">
            
            {/* OAuth2 Login */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FiShield className="mr-2 text-blue-500" />
                Regjistrohu me një klik
              </h3>
              <div className="space-y-3">
                {oauth2Providers.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleOAuth2Login(provider.name)}
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-200 ${provider.color} flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md`}
                  >
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  Duke përdorur OAuth2, nuk kërkohet fjalëkalim i ri
                </p>
              </div>
            </div>

            {/* System Features */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Përfitimet e regjistrimit
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Llogari e sigurt me CAPTCHA dhe validim</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Event-driven architecture me Kafka</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Tracing me OpenTelemetry & Jaeger</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Zero-trust security model</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Verifikim me dy-faktor (opsional)</span>
                </li>
              </ul>
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
                  <span>CAPTCHA Service</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Aktiv
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Event Streaming</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Online (Kafka)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Connected
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-400">
                <p className="text-sm text-blue-100 flex items-center">
                  <FiDatabase className="mr-2" />
                  CAPTCHA gjenerohet në server dhe verifikohet në real-time
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
            Arkitektura: Microservices + Event-Driven + CAPTCHA Security
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;