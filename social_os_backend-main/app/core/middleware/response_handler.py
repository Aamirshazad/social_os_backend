"""
Response Handler - Standardized API responses matching Next.js pattern
"""
from typing import Any, Dict, Optional, List
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import structlog

logger = structlog.get_logger()


def success_response(data: Any, status_code: int = 200) -> JSONResponse:
    """
    Standardized success response
    
    Args:
        data: Response data
        status_code: HTTP status code
        
    Returns:
        JSONResponse with standardized format
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "data": data,
            "error": None
        }
    )


def error_response(error: Exception, request_id: Optional[str] = None) -> JSONResponse:
    """
    Standardized error response
    
    Args:
        error: Exception that occurred
        request_id: Optional request ID for tracking
        
    Returns:
        JSONResponse with standardized error format
    """
    if isinstance(error, HTTPException):
        status_code = error.status_code
        message = error.detail
    elif isinstance(error, ValueError):
        status_code = 400
        message = str(error)
    elif isinstance(error, PermissionError):
        status_code = 403
        message = "Insufficient permissions"
    elif isinstance(error, FileNotFoundError):
        status_code = 404
        message = "Resource not found"
    else:
        status_code = 500
        message = "Internal server error"
        logger.error("unexpected_error", error=str(error), request_id=request_id)
    
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "error": {
                "message": message,
                "code": status_code,
                "request_id": request_id
            }
        }
    )


def validation_error_response(error: ValidationError, request_id: Optional[str] = None) -> JSONResponse:
    """
    Standardized validation error response
    
    Args:
        error: Pydantic validation error
        request_id: Optional request ID for tracking
        
    Returns:
        JSONResponse with validation error details
    """
    errors = []
    for err in error.errors():
        errors.append({
            "field": ".".join(str(x) for x in err["loc"]),
            "message": err["msg"],
            "type": err["type"]
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "error": {
                "message": "Validation failed",
                "code": 422,
                "request_id": request_id,
                "details": errors
            }
        }
    )


class UnauthorizedError(Exception):
    """Unauthorized access error"""
    pass


class ForbiddenError(Exception):
    """Forbidden access error"""
    pass


class NotFoundError(Exception):
    """Resource not found error"""
    pass
