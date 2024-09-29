import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UsersService } from './users.service';
import {
  ActivationResponseType,
  LoginResponseType,
  LogoutResponseType,
  RegisterResponseType,
} from './types/user.type';
import { ActivationDto, LoginDto, RegisterDto } from './dto/user.dto';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Response } from 'express';
import { AuthGuard } from './guards/auth.guard';

@Resolver('User')
export class UserResolver {
  constructor(private readonly userService: UsersService) {}

  @Mutation(() => RegisterResponseType)
  async register(
    @Args('registerDto') registerDto: RegisterDto,
    @Context() context: { res: Response },
  ): Promise<RegisterResponseType> {
    if (
      !registerDto.userName ||
      !registerDto.email ||
      !registerDto.password ||
      !registerDto.confirmPassword
    ) {
      throw new BadRequestException('All fields are required');
    }
    const { token } = await this.userService.register(registerDto, context.res);
    return { activationToken: token };
  }

  @Mutation(() => ActivationResponseType)
  async activateUser(
    @Args('activationDto') activationDto: ActivationDto,
    @Context() context: { res: Response },
  ): Promise<ActivationResponseType> {
    if (!activationDto.activationCode || !activationDto.activationToken) {
      throw new BadRequestException('All fields are required');
    }
    return await this.userService.activateUser(activationDto, context.res);
  }

  @Mutation(() => LoginResponseType)
  async login(
    @Args('loginDto') loginDto: LoginDto,
  ): Promise<LoginResponseType> {
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException('Email and password are required');
    }
    return await this.userService.login(loginDto);
  }

  @Query(() => LoginResponseType)
  @UseGuards(AuthGuard)
  async getLoggedInUser(
    @Context() context: { req: Response },
  ): Promise<LoginResponseType> {
    return await this.userService.getLoggedInUser(context.req);
  }

  @Query(() => LogoutResponseType)
  async logout(
    @Context() context: { res: Response },
  ): Promise<LogoutResponseType> {
    return await this.userService.logout(context.res);
  }

  @Query(() => [User])
  async getAllUser() {
    return this.userService.getAllUser();
  }
}
