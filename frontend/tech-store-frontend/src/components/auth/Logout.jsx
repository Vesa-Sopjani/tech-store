// src/components/auth/Logout.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  FiLogOut, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiHome,
  FiUser,
  FiRefreshCw 
} from 'react-icons/fi';
import { publishKafkaEvent } from '../../services/eventService';
import { useTelemetry } from '../../hooks/useTelemetry';

const Logout = () => {
  const navigate = useNavigate();
  const { logout: authLogout, user } = useAuth();
  const { startSpan, endSpan } = useTelemetry();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutStatus, setLogoutStatus] = useState({
    step: 1,
    totalSteps: 4,
    messages: []
  });

  useEffect(() => {
    // Automatically initiate logout when component mounts
    handleLogout();
  }, []);

  const addStatusMessage = (message, type = 'info') => {
    setLogoutStatus(prev => ({
      ...prev,
      messages: [...prev.messages, { message, type, timestamp: new Date().toISOString() }]
    }));
  };

  const handleLogout = async () => {
    const span = startSpan('logout_process');
    setIsLoggingOut(true);
    
    try {
      // Step 1: Prepare for logout
      setLogoutStatus(prev => ({ ...prev, step: 1 }));
      addStatusMessage('🔄 Po përgatitem për çkyçje...');
      
      // Publish logout event to Kafka
      if (user) {
        try {
          await publishKafkaEvent('user.logged_out', {
            userId: user.id,
            username: user.username || user.email,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
          addStatusMessage('✅ Event-i i çkyçjes u dërgua me sukses');
        } catch (kafkaError) {
          console.warn('⚠️ Kafka event failed:', kafkaError);
          addStatusMessage('ℹ️ Event-i i çkyçjes nuk u dërgua (jo kritike)', 'warning');
        }
      }

      // Step 2: Clear local storage and state
      setLogoutStatus(prev => ({ ...prev, step: 2 }));
      addStatusMessage('🧹 Po pastroj të dhënat lokale...');
      
      // Clear any frontend tokens and data
      const cookiesToClear = [
        'session_token',
        'refresh_token',
        'access_token',
        'user_session'
      ];
      
      cookiesToClear.forEach(cookie => {
        document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      
      // Clear localStorage
      const storageKeys = [
        'tech_store_user',
        'tech_store_tokens',
        'user_data',
        'auth_state'
      ];
      
      storageKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Step 3: Call server logout API
      setLogoutStatus(prev => ({ ...prev, step: 3 }));
      addStatusMessage('🌐 Po dërgoj kërkesë për çkyçje në server...');
      
      await authLogout();
      addStatusMessage('✅ Çkyçja u krye me sukses në server');

      // Step 4: Final cleanup
      setLogoutStatus(prev => ({ ...prev, step: 4 }));
      addStatusMessage('✅ Po përfundoj procesin e çkyçjes...');

      // Show success message
      toast.success(
        <div className="flex items-center">
          <FiCheckCircle className="mr-2" />
          U çkyçët me sukses! Mirupafshim!
        </div>
      );

      endSpan(span, 'success');

      // Wait a moment then redirect
      setTimeout(() => {
        addStatusMessage('🔄 Po të ridrejtoj në faqen kryesore...');
        navigate('/');
      }, 1500);

    } catch (error) {
      console.error('❌ Logout error:', error);
      
      addStatusMessage(`❌ Gabim gjatë çkyçjes: ${error.message}`, 'error');
      
      toast.error(
        <div className="flex items-center">
          <FiAlertCircle className="mr-2" />
          Dështoi çkyçja. Ju lutem provoni përsëri.
        </div>
      );

      endSpan(span, 'error');

      // Still redirect even if logout failed
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } finally {
      setIsLoggingOut(false);
    }
    // Verifikimi i cookies pas logout
setTimeout(() => {
  console.log('🔍 Cookies after logout:', document.cookie);
  console.log('🔍 localStorage after logout:', localStorage.length === 0 ? 'Empty' : 'Has items');
  
  if (document.cookie) {
    addStatusMessage('⚠️ Vërejtje: Disa cookies mund të jenë ende të pranishme', 'warning');
  } else {
    addStatusMessage('✅ Të gjitha cookies u fshinë me sukses');
  }
}, 1000);
  };

  const handleCancel = () => {
    navigate(-1); // Go back
  };

  const handleForceLogout = () => {
    // Force clear everything and redirect
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    localStorage.clear();
    sessionStorage.clear();
    
    toast.info('Të gjitha cookies dhe të dhënat u fshinë me forcë');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        {/* Logout Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl shadow-lg mb-4">
              <FiLogOut className="text-3xl text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Po çkyçeni
            </h1>
            <p className="text-gray-600">
              {user ? (
                <>
                  Mirupafshim, <span className="font-semibold">{user.username || user.email}</span>!
                </>
              ) : (
                'Po përgatiteni për çkyçje...'
              )}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progresi i çkyçjes
              </span>
              <span className="text-sm text-gray-500">
                Hapi {logoutStatus.step} nga {logoutStatus.totalSteps}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(logoutStatus.step / logoutStatus.totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Statusi i çkyçjes:
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logoutStatus.messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex items-start p-3 rounded-lg ${
                    msg.type === 'error' 
                      ? 'bg-red-50 border border-red-200' 
                      : msg.type === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {msg.type === 'error' ? (
                    <FiAlertCircle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  ) : msg.type === 'warning' ? (
                    <FiAlertCircle className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  ) : (
                    <FiCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    msg.type === 'error' 
                      ? 'text-red-700' 
                      : msg.type === 'warning'
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                  }`}>
                    {msg.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoggingOut && (
            <div className="text-center mb-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-2"></div>
              <p className="text-sm text-gray-600">Po ju çkyçim, ju lutem prisni...</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isLoggingOut && logoutStatus.step < logoutStatus.totalSteps && (
              <>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  <FiLogOut className="mr-2" />
                  Çkyçu Tani
                </button>

                <button
                  onClick={handleCancel}
                  disabled={isLoggingOut}
                  className="w-full py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Anulo
                </button>
              </>
            )}

            {/* Debug button for development */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleForceLogout}
                className="w-full py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition flex items-center justify-center"
              >
                <FiRefreshCw className="mr-2" />
                Çkyçje me Forcë (Debug)
              </button>
            )}
          </div>

          {/* Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Çfarë ndodh gjatë çkyçjes:
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Session-i në server fshihet</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Cookies fshihen nga shfletuesi</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Të dhënat lokale pastrohen</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Event-i i çkyçjes regjistrohet</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <FiHome className="mr-1" />
              Faqja Kryesore
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <FiUser className="mr-1" />
              Kyçu Përsëri
            </button>
          </div>
        </div>
        

        {/* Cookies Status (Debug) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Statusi i Cookies (Debug):</h4>
            <div className="text-xs text-gray-600 overflow-x-auto">
              <p>Cookies aktuale: {document.cookie || '(bosh)'}</p>
              <p className="mt-1">Cookies-të do të fshihen plotësisht</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logout;