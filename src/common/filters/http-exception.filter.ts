import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    if (!isHttpException) {
      console.error('[HttpExceptionFilter] Unhandled exception:', exception);
    }

    const httpException = isHttpException
      ? exception
      : new InternalServerErrorException('Unexpected error');

    const status = httpException.getStatus();
    const body = httpException.getResponse();

    response
      .status(status)
      .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
  }
}
