/* istanbul ignore file */
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { createMap, forMember, ignore, mapFrom, Mapper, mapWith } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { UserEntity } from './user.entity';
import {
  RegisterRequest,
  RegisterResponse,
  LoginResponse,
  ReadChefCategoryOverviewDTO,
  ReadChefDTO,
  UpdateChefCategoryOverviewDTO,
  UserSession,
} from '@app/common/dto';
import bcrypt from 'bcryptjs';
import { ChefCategoryOverviewEntity } from './chef.category.overview.entity';

@Injectable()
export class UserEntityProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  override get profile() {
    return (mapper) => {
      createMap(
        mapper,
        RegisterRequest,
        UserEntity,
        forMember((dest) => dest.id, ignore()),
        forMember((dest) => dest.createdAt, ignore()),
        forMember(
          (dest) => dest.passwordHash,
          mapFrom((src) => bcrypt.hashSync(src.password, bcrypt.genSaltSync(12))),
        ),
        forMember(
          (dest) => dest.role,
          mapFrom((src) => src.role.toString()),
        ),
      );
      createMap(
        mapper,
        UpdateChefCategoryOverviewDTO,
        ChefCategoryOverviewEntity,
        forMember((dest) => dest.chef, ignore()),
      );
      createMap(mapper, UserEntity, RegisterResponse);
      createMap(mapper, UserEntity, LoginResponse);
      createMap(mapper, UserEntity, UserSession);
      createMap(mapper, ChefCategoryOverviewEntity, ReadChefCategoryOverviewDTO);
      createMap(
        mapper,
        UserEntity,
        ReadChefDTO,
        forMember(
          (dest) => dest.categoryOverview,
          mapWith(ReadChefCategoryOverviewDTO, ChefCategoryOverviewEntity, (src) => src.categoryOverview),
        ),
      );
    };
  }
}
