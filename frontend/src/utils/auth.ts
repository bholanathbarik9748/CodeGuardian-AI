/**
 * Authentication utilities for token management
 */

const TOKEN_KEY = 'codeguardian_token';

export interface User {
  sub: number;
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

/**
 * Get the API base URL from environment or default
 */
export const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

/**
 * Store JWT token in localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get JWT token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

/**
 * Get authorization header for API requests
 */
export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Fetch current user from API
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getApiUrl()}/auth/me`, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Token might be invalid, remove it
      removeToken();
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    removeToken();
    return null;
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await fetch(`${getApiUrl()}/auth/logout`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout request failed:', error);
  } finally {
    removeToken();
    // Redirect to login page
    window.location.href = '/';
  }
};

