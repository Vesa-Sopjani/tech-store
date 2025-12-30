import { useState, useEffect } from 'react';
import { getCaptcha } from '../services/captchaService';

export const useCaptcha = () => {
  const [captcha, setCaptcha] = useState({ id: '', image: '', loading: true, error: null });

  const loadCaptcha = async () => {
    setCaptcha(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getCaptcha();
      setCaptcha({ id: data.id, image: data.image, loading: false, error: null });
    } catch (err) {
      setCaptcha({ id: '', image: '', loading: false, error: 'CAPTCHA nuk u ngarkua' });
    }
  };

  useEffect(() => { loadCaptcha(); }, []);

  return { captcha, loadCaptcha };
};
