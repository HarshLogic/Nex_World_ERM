function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // Auto-detect production Railway backend when deployed
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.railway.app') || host === 'nexperfumeerp.up.railway.app') {
      return 'https://erp-backend-production-c612ea0b.up.railway.app/api';
    }
  }

  return 'http://localhost:5000/api';
}

/**
 * Standard Production API Client
 * Automatically handles JWT authorization headers, cookies, and JSON serialization.
 */
async function fetchClient(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}${cleanEndpoint}`;

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('erp_token') : null;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    let data = null;

    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (response.ok) {
      return data || { success: true };
    }

    // Return structured API error from server
    return {
      success: false,
      statusCode: response.status,
      message: data?.message || `Request failed with status ${response.status}`,
      code: data?.code || 'API_ERROR',
      data: data?.data || null,
    };
  } catch (err) {
    console.error(`[API NETWORK ERROR] ${options.method || 'GET'} ${cleanEndpoint}:`, err.message);
    return {
      success: false,
      statusCode: 503,
      message: 'Unable to communicate with the server. Please check your network connection.',
      code: 'NETWORK_ERROR',
      data: null,
    };
  }
}

export const api = {
  get: (endpoint, options) => fetchClient(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => fetchClient(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => fetchClient(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => fetchClient(endpoint, { method: 'DELETE', ...options }),
};
