import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { RmqModule, DbModule } from '@app/common';
import { USERS_DB } from '@app/common/constants';
import { UsersRepository } from './users.repository';
import { UserEntity } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBITMQ_URI: Joi.string().required(),
        RABBITMQ_USERS_QUEUE: Joi.string().required(),

        POSTGRES_USERS_URI: Joi.string().required(),
      }),
    }),
    RmqModule,
    DbModule({ name: USERS_DB }),
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
