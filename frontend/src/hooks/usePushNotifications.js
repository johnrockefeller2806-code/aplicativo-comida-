import { useState, useEffect, useCallback } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(token) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };
    
    checkSupport();
  }, []);

  // Check subscription status
  useEffect(() => {
    if (!token) return;
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API}/push/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setIsSubscribed(data.subscribed);
        }
      } catch (err) {
        console.error('Error checking push status:', err);
      }
    };
    
    checkStatus();
  }, [token]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (err) {
      console.error('Service worker registration failed:', err);
      throw err;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !token) {
      setError('Push notifications not supported or not logged in');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission !== 'granted') {
        setError('Notification permission denied');
        setLoading(false);
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${API}/push/vapid-key`);
      const { publicKey } = await vapidResponse.json();
      
      if (!publicKey) {
        throw new Error('VAPID key not available');
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const response = await fetch(`${API}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(subscription.toJSON())
      });

      if (response.ok) {
        setIsSubscribed(true);
        setLoading(false);
        return true;
      } else {
        throw new Error('Failed to save subscription on server');
      }
    } catch (err) {
      console.error('Push subscription error:', err);
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [isSupported, token, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      // Unsubscribe from server
      const response = await fetch(`${API}/push/unsubscribe`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        // Also unsubscribe from browser
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
        
        setIsSubscribed(false);
        setLoading(false);
        return true;
      } else {
        throw new Error('Failed to unsubscribe');
      }
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [token]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe
  };
}

export default usePushNotifications;
