import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message,
  } as ApiResponse<T>, { status: 200 });
}

export function errorResponse(error: string, status: number = 400) {
  return NextResponse.json({
    success: false,
    error,
  } as ApiResponse, { status });
}

export function validationErrorResponse(errors: any) {
  return NextResponse.json({
    success: false,
    error: 'Validation failed',
    details: errors,
  }, { status: 400 });
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json({
    success: false,
    error: message,
  } as ApiResponse, { status: 401 });
}

export function serverErrorResponse(error: unknown) {
  console.error('Server error:', error);
  return NextResponse.json({
    success: false,
    error: error instanceof Error ? error.message : 'Internal server error',
  } as ApiResponse, { status: 500 });
}
