"""
Custom exceptions for the application
"""
from fastapi import HTTPException, status


class APIException(HTTPException):
    """Base API exception"""
    
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)
        self.status_code = status_code
        self.detail = detail


class AuthenticationError(APIException):
    """Authentication failed"""
    
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class AuthorizationError(APIException):
    """Authorization failed"""
    
    def __init__(self, detail: str = "Not authorized to access this resource"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class NotFoundError(APIException):
    """Resource not found"""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found"
        )


class ValidationError(APIException):
    """Validation error"""
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class DuplicateError(APIException):
    """Resource already exists"""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{resource} already exists"
        )


class RateLimitError(APIException):
    """Rate limit exceeded"""
    
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail
        )


class ExternalAPIError(APIException):
    """External API error"""
    
    def __init__(self, service: str, detail: str = None):
        message = f"Error communicating with {service}"
        if detail:
            message += f": {detail}"
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=message
        )


class DatabaseError(APIException):
    """Database operation error"""
    
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )


class ServiceUnavailableError(APIException):
    """Service temporarily unavailable"""
    
    def __init__(self, detail: str = "Service temporarily unavailable"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )


class ConfigurationError(APIException):
    """Configuration or environment error"""
    
    def __init__(self, detail: str = "Configuration error"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )


class MediaError(APIException):
    """Media upload/processing error"""
    
    def __init__(self, detail: str = "Media operation failed"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class TimeoutError(APIException):
    """Request timeout error"""
    
    def __init__(self, detail: str = "Request timeout"):
        super().__init__(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=detail
        )


class PlatformError(APIException):
    """Social platform specific error"""
    
    def __init__(self, platform: str, detail: str):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{platform}: {detail}"
        )


class QuotaExceededError(APIException):
    """Quota or limit exceeded"""
    
    def __init__(self, detail: str = "Quota exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail
        )


class BusinessLogicError(APIException):
    """Business logic validation error"""
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class InsufficientPermissionsError(APIException):
    """User lacks required permissions"""
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


# Utility functions for error handling

def handle_database_error(e: Exception, operation: str = "database operation") -> DatabaseError:
    """
    Convert database exceptions to DatabaseError
    
    Args:
        e: The caught exception
        operation: Description of the operation
    
    Returns:
        DatabaseError with appropriate message
    """
    error_msg = str(e)
    if "constraint" in error_msg.lower():
        return DatabaseError(f"Database constraint violation during {operation}")
    elif "timeout" in error_msg.lower():
        return DatabaseError(f"Database timeout during {operation}")
    else:
        return DatabaseError(f"Database error during {operation}: {error_msg}")


def handle_external_api_error(e: Exception, service: str) -> ExternalAPIError:
    """
    Convert external API exceptions to ExternalAPIError
    
    Args:
        e: The caught exception
        service: Name of the external service
    
    Returns:
        ExternalAPIError with appropriate message
    """
    error_msg = str(e)
    
    # Check for common API error patterns
    if "401" in error_msg or "unauthorized" in error_msg.lower():
        return ExternalAPIError(service, "Invalid or expired credentials")
    elif "403" in error_msg or "forbidden" in error_msg.lower():
        return ExternalAPIError(service, "Access forbidden")
    elif "429" in error_msg or "rate limit" in error_msg.lower():
        return QuotaExceededError(f"{service} rate limit exceeded")
    elif "timeout" in error_msg.lower():
        return TimeoutError(f"{service} request timeout")
    else:
        return ExternalAPIError(service, error_msg)


def get_error_response(error: APIException) -> dict:
    """
    Generate standardized error response
    
    Args:
        error: The API exception
    
    Returns:
        Standardized error response dict
    """
    return {
        "success": False,
        "error": error.detail,
        "status_code": error.status_code
    }


class ErrorContext:
    """Context manager for enhanced error handling"""
    
    def __init__(self, operation: str, raise_on_error: bool = True):
        self.operation = operation
        self.raise_on_error = raise_on_error
        self.error = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            return True
        
        # Store error for inspection
        self.error = exc_val
        
        # Convert to appropriate API exception
        if isinstance(exc_val, APIException):
            if self.raise_on_error:
                return False  # Re-raise
            return True  # Suppress
        
        # Handle common exception types
        if "database" in str(exc_val).lower() or "sql" in str(exc_val).lower():
            if self.raise_on_error:
                raise handle_database_error(exc_val, self.operation)
        elif "timeout" in str(exc_val).lower():
            if self.raise_on_error:
                raise TimeoutError(f"Timeout during {self.operation}")
        else:
            if self.raise_on_error:
                raise APIException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error during {self.operation}: {str(exc_val)}"
                )
        
        return not self.raise_on_error
