import { ErrorObject } from '@app/common/errors';
import { Catch, ArgumentsHost, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  transform(response, err: ErrorObject) {
    response.status(err.errorCode).json({
      statusCode: err.errorCode,
      message: err.message,
      errorType: err.errorType,
    });
  }
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    if (exception.status === 'CustomRpcException') {
      const err: ErrorObject = exception;
      this.transform(response, err);
    } else if ('error' in exception && 'status' in exception.error && exception.error.status === 'CustomRpcException') {
      console.log(exception);
      const err: ErrorObject = exception.error;
      this.transform(response, err);
    } else if (exception instanceof HttpException) {
      console.log(exception);
      response.status(exception.getStatus()).json(exception.getResponse());
    } else {
      console.log(exception);
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error!',
      });
    }
  }
}
