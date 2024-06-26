import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices/enums/transport.enum';

@Injectable()
export class RmqService {
  constructor(private readonly env: ConfigService) {}

  getOptions(name: string, noAck = true): RmqOptions {
    return {
      transport: Transport.RMQ,
      options: {
        urls: [this.env.get<string>('RABBITMQ_URI')],
        queue: this.env.get<string>(`${name}_QUEUE`),
        noAck,
        persistent: true,
        // Uncomment this section when debugging.
        // socketOptions: {
        //   heartbeatIntervalInSeconds: 3600,
        // },
      },
    };
  }

  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.ack(originalMessage);
  }
}
