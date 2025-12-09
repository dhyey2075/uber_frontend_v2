// Utility functions for authentication state management

export const getAuthKey = () => {
  const userToken = localStorage.getItem('token');
  const captainToken = localStorage.getItem('captain_token');
  // Use the actual token as key to force remount when token changes
  if (userToken) {
    return `user-${userToken.substring(0, 20)}`; // Use first 20 chars to keep key reasonable
  }
  if (captainToken) {
    return `captain-${captainToken.substring(0, 20)}`; // Use first 20 chars to keep key reasonable
  }
  return 'no-auth';
};

export const clearAllTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('captain_token');
};

