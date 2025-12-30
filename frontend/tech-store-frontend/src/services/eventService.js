// services/eventService.js
import { API_URL } from "../utils/constants";

/**
 * Kafka Event Publishing Service
 */
export const publishKafkaEvent = async (eventType, eventData) => {
  try {
    // Në mjedisin e prodhimit, kjo do të dërgonte në Kafka
    // Për momentin, bëjmë një API call
    
    const event = {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
      source: 'web-client',
      correlationId: generateCorrelationId()
    };

    // Log event locally për debug
    console.log(`[Event] ${eventType}:`, event);

    // Nëse kemi API për events
    if (API_URL && API_URL !== 'http://localhost:3000') {
      const response = await fetch(`${API_URL}/api/events/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': eventType
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        console.warn('Event publishing failed:', await response.text());
      }
    }

    return true;
  } catch (error) {
    console.error('Event publishing error:', error);
    // Mos e hedh error, sepse nuk duhet të ndikojë në funksionimin kryesor
    return false;
  }
};

/**
 * Audit logging
 */
export const logAuditEvent = async (action, details, userId = null) => {
  try {
    const auditEvent = {
      action,
      details,
      userId,
      ip: await getClientIP(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Ruaj në localStorage për debug
    const auditLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
    auditLogs.push(auditEvent);
    
    // Mbaj vetëm 100 events
    if (auditLogs.length > 100) {
      auditLogs.shift();
    }
    
    localStorage.setItem('audit_logs', JSON.stringify(auditLogs));

    // Publiko në Kafka
    await publishKafkaEvent('audit.log', auditEvent);

    return true;
  } catch (error) {
    console.error('Audit logging error:', error);
    return false;
  }
};

/**
 * Security event logging
 */
export const logSecurityEvent = async (eventType, details, severity = 'medium') => {
  try {
    const securityEvent = {
      eventType,
      details,
      severity,
      ip: await getClientIP(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Ruaj në localStorage për debug
    const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    securityLogs.push(securityEvent);
    
    if (securityLogs.length > 50) {
      securityLogs.shift();
    }
    
    localStorage.setItem('security_logs', JSON.stringify(securityLogs));

    // Publiko në Kafka
    await publishKafkaEvent('security.event', securityEvent);

    return true;
  } catch (error) {
    console.error('Security event logging error:', error);
    return false;
  }
};

// Helper functions
const generateCorrelationId = () => {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};