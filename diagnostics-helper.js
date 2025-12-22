// Helper functions for diagnostic report generation

// Anonymize sensitive values
function anonymizeValue(value, type = 'generic') {
  if (!value || typeof value !== 'string') return value;
  
  // Common patterns to anonymize
  if (type === 'api-key' || value.startsWith('sk-') || value.startsWith('pk.') || value.startsWith('AIza')) {
    return value.substring(0, 8) + '...' + value.substring(value.length - 4);
  }
  if (type === 'token' || value.length > 50) {
    return value.substring(0, 8) + '...' + value.substring(value.length - 4);
  }
  if (type === 'password' || type === 'hash') {
    return '***HIDDEN***';
  }
  if (type === 'email') {
    const parts = value.split('@');
    if (parts.length === 2) {
      return parts[0].substring(0, 2) + '***@' + parts[1].substring(0, 2) + '***';
    }
  }
  
  return value;
}

module.exports = { anonymizeValue };

