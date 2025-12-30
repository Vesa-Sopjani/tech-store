// frontend/src/hooks/useTelemetry.js - Version i korrigjuar
import { useEffect, useRef } from 'react';

// Eksporto si default dhe named export
const useTelemetry = () => {
  const spans = useRef(new Map());

  // Initialize telemetry
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Telemetry initialized');
    }
    return () => spans.current.clear();
  }, []);

  // Start a new span
  const startSpan = (name, attributes = {}) => {
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const span = {
      id: spanId,
      name,
      startTime,
      attributes: {
        ...attributes,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };

    spans.current.set(spanId, span);

    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Span started: ${name}`, { spanId });
    }

    return spanId;
  };

  // End a span
  const endSpan = (spanId, status = 'success', additionalAttributes = {}) => {
    const span = spans.current.get(spanId);
    
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - span.startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Span ended: ${span.name}`, {
        duration: `${duration.toFixed(2)}ms`,
        status
      });
    }

    spans.current.delete(spanId);

    return { ...span, endTime, duration, status };
  };

  // Record an event
  const recordEvent = (eventName, eventData = {}) => {
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      data: eventData
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Event recorded: ${eventName}`, event);
    }

    return event;
  };

  return {
    startSpan,
    endSpan,
    recordEvent
  };
};

// Eksporto si default
export default useTelemetry;

// Eksporto si named export gjithashtu
export { useTelemetry };