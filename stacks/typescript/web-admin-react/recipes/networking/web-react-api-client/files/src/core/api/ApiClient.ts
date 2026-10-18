export interface ServiceResponseEnvelope<T> {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly status: number;

  constructor(message: string, code: string = 'API_ERROR', status: number = 400, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '{{API_BASE_URL}}') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-correlation-id': `web_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers as any)
      }
    });

    let payload: any;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errMessage = payload?.error?.message || payload?.message || `HTTP ${response.status} Request Failed`;
      const errCode = payload?.error?.code || 'HTTP_ERROR';
      throw new ApiError(errMessage, errCode, response.status, payload?.error?.details);
    }

    // Handle ServiceResult<T> envelope automatically
    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (!payload.success) {
        throw new ApiError(
          payload.error?.message || 'Operation failed',
          payload.error?.code || 'OPERATION_FAILED',
          response.status,
          payload.error?.details
        );
      }
      return payload.data as T;
    }

    return payload as T;
  }

  public get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  public put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  public delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
