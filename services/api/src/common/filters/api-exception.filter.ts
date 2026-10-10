import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@parkeazy/shared-types';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let error = 'InternalServerError';
    let validationErrors: string[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || message;
        error = obj.error || error;
        if (Array.isArray(obj.message)) {
          validationErrors = obj.message;
          message = 'Validation Failed';
        } else if (Array.isArray(obj.validationErrors)) {
          validationErrors = obj.validationErrors;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception on ${request.url}: ${exception.message}`, exception.stack);

      // Safe error categorization
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
        error = 'BadRequest';
      } else {
        // Never expose database error details or SQL statements to clients
        message = 'An unexpected server error occurred. Please try again later.';
        error = 'InternalServerError';
      }
    }

    const errorPayload: ApiErrorResponse = {
      statusCode: status,
      error,
      message,
      ...(validationErrors ? { validationErrors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorPayload);
  }
}
