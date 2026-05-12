/**
 * Error Handler Service
 * Detects specific error types and provides user-friendly messages with suggestions
 */

export class ErrorHandler {
  /**
   * Analyze error and return detailed information
   * @param {Error|string} error - The error to analyze
   * @param {string} context - Context of where the error occurred (e.g., 'login', 'load-repos')
   * @returns {Object} - { type, message, details, suggestion }
   */
  static analyzeError(error, context = 'general') {
    const errorStr = error?.message || String(error) || 'Unknown error'
    const errorType = error?.type || 'Error'

    // CORS Errors - typically TypeError with 'fetch' or network access issues
    if (this.isCorsError(error, errorStr)) {
      return {
        type: 'CORS_ERROR',
        message: 'Connection blocked by CORS policy',
        details: 'Your browser blocked the request due to Cross-Origin Resource Sharing (CORS) restrictions',
        suggestion: 'The Docker Registry must be configured with CORS headers, or use the development proxy (Vite) for testing'
      }
    }

    // Network / Connection errors
    if (this.isNetworkError(error, errorStr)) {
      if (this.isConnectionRefusedError(errorStr)) {
        return {
          type: 'CONNECTION_REFUSED',
          message: 'Cannot connect to registry',
          details: 'The server refused the connection. The registry may be offline or unreachable.',
          suggestion: 'Check if the registry URL is correct and the server is running. Check firewall settings.'
        }
      }

      if (this.isDnsError(errorStr)) {
        return {
          type: 'DNS_ERROR',
          message: 'Cannot resolve registry address',
          details: 'The domain name could not be resolved to an IP address.',
          suggestion: 'Check if the registry URL is spelled correctly and if your internet connection is working'
        }
      }

      return {
        type: 'NETWORK_ERROR',
        message: 'Network connection failed',
        details: 'Unable to connect to the registry. This could be a network issue or the server is unreachable.',
        suggestion: 'Check your internet connection and verify the registry URL is accessible'
      }
    }

    // Timeout errors
    if (this.isTimeoutError(errorStr)) {
      return {
        type: 'TIMEOUT',
        message: 'Request timeout',
        details: 'The registry took too long to respond.',
        suggestion: 'The registry may be slow or unreachable. Try again later or check if the URL is correct.'
      }
    }

    // Authentication errors (401)
    if (errorStr.includes('401') || errorStr.includes('Authentication failed')) {
      return {
        type: 'AUTH_ERROR',
        message: 'Authentication failed',
        details: 'The provided credentials are invalid or expired.',
        suggestion: 'Check your username and password are correct. If the registry doesn\'t require authentication, leave the fields empty.'
      }
    }

    // Forbidden errors (403)
    if (errorStr.includes('403')) {
      return {
        type: 'FORBIDDEN',
        message: 'Access denied',
        details: 'You don\'t have permission to access this registry.',
        suggestion: 'Check if your account has sufficient permissions for this registry'
      }
    }

    // Not found errors (404)
    if (errorStr.includes('404') || errorStr.includes('not found')) {
      return {
        type: 'NOT_FOUND',
        message: 'Registry not found',
        details: 'The specified registry URL does not exist or returned 404.',
        suggestion: 'Verify that the registry URL is correct. Make sure you\'re using the full URL including https://'
      }
    }

    // Invalid URL
    if (errorStr.includes('URL not configured') || errorStr.includes('Invalid URL')) {
      return {
        type: 'INVALID_URL',
        message: 'Invalid registry URL',
        details: 'The registry URL is missing or malformed.',
        suggestion: 'Enter a valid registry URL (e.g., https://registry.example.com or http://localhost:5000)'
      }
    }

    // Generic API error
    if (errorStr.includes('Registry API error')) {
      const statusMatch = errorStr.match(/(\d{3})/)
      const status = statusMatch ? statusMatch[1] : 'unknown'
      return {
        type: 'API_ERROR',
        message: `Registry API error (${status})`,
        details: errorStr,
        suggestion: 'The registry returned an error. Check the registry is running and accessible.'
      }
    }

    // Default error
    return {
      type: 'UNKNOWN_ERROR',
      message: 'An error occurred',
      details: errorStr,
      suggestion: 'Check the browser console for more details. Try again or contact your administrator.'
    }
  }

  /**
   * Check if error is a CORS error
   * @private
   */
  static isCorsError(error, errorStr) {
    const corsKeywords = [
      'CORS',
      'cross-origin',
      'cross origin',
      'Access-Control',
      'blocked by CORS',
      'Network request failed'
    ]

    if (error?.type === 'TypeError' && errorStr.toLowerCase().includes('failed to fetch')) {
      // This could be CORS, network error, or other issue
      // In browser, CORS errors often show as generic "Failed to fetch"
      return true
    }

    return corsKeywords.some(keyword =>
      errorStr.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  /**
   * Check if error is a network error
   * @private
   */
  static isNetworkError(error, errorStr) {
    const networkKeywords = [
      'Failed to fetch',
      'ERR_CONNECTION',
      'ERR_NAME_NOT_RESOLVED',
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'ENETUNREACH',
      'network',
      'unreachable',
      'refused'
    ]

    return error?.type === 'TypeError' ||
           networkKeywords.some(keyword =>
             errorStr.toUpperCase().includes(keyword.toUpperCase())
           )
  }

  /**
   * Check if error is connection refused
   * @private
   */
  static isConnectionRefusedError(errorStr) {
    return /ECONNREFUSED|Connection refused|ERR_CONNECTION_REFUSED/i.test(errorStr)
  }

  /**
   * Check if error is DNS/name resolution error
   * @private
   */
  static isDnsError(errorStr) {
    return /ENOTFOUND|ERR_NAME_NOT_RESOLVED|dns|getaddrinfo|Name or service not known/i.test(errorStr)
  }

  /**
   * Check if error is timeout
   * @private
   */
  static isTimeoutError(errorStr) {
    return /timeout|ETIMEDOUT|timed out/i.test(errorStr)
  }

  /**
   * Format error for display in UI
   * @param {Error|string} error
   * @param {string} context
   * @returns {Object} - { message, details, suggestion, type }
   */
  static getDisplayMessage(error, context = 'general') {
    const analyzed = this.analyzeError(error, context)
    return {
      message: analyzed.message,
      details: analyzed.details,
      suggestion: analyzed.suggestion,
      type: analyzed.type
    }
  }

  /**
   * Get simple message for quick display
   * @param {Error|string} error
   * @returns {string}
   */
  static getSimpleMessage(error) {
    const analyzed = this.analyzeError(error)
    return analyzed.message
  }
}

export default ErrorHandler
