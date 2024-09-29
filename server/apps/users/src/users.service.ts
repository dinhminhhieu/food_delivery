/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { ActivationDto, LoginDto, RegisterDto } from './dto/user.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { EmailService } from './email/email.service';
import { TokenSender } from './utils/sendToken';

type UserType = {
  userName: string;
  email: string;
  password: string;
  phoneNumber: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly JwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  // Register service
  async register(registerDto: RegisterDto, response: Response) {
    const { userName, email, password, confirmPassword, phoneNumber } =
      registerDto;
    const isEmailExist = await this.prisma.user.findUnique({
      where: { email },
    });
    if (isEmailExist) {
      throw new BadRequestException('Email already exist');
    }
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const isPhoneNumberExist = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (isPhoneNumberExist) {
      throw new BadRequestException('Phone number already exist');
    }
    const saltBcrypt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, saltBcrypt);
    const user = {
      userName,
      email,
      password: hashedPassword,
      phoneNumber,
    };
    const activationToken = await this.createActivationToken(user);
    const activationCode = activationToken.activationCode;
    const token = activationToken.activationToken;
    await this.emailService.sendEmail({
      subject: 'Kích hoạt tài khoản',
      email: user.email,
      userName: user.userName,
      activationCode: activationCode,
      template: './activation-mail',
    });
    return { token, response };
  }

  // Create activation token service
  async createActivationToken(user: UserType) {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const activationToken = this.JwtService.sign(
      {
        user,
        activationCode,
      },
      {
        secret: this.configService.get<string>('ACTIVATION_TOKEN_SECRET'),
        expiresIn: '10m',
      },
    );
    return { activationToken, activationCode };
  }

  // Activate account service
  async activateUser(activationDto: ActivationDto, response: Response) {
    const { activationCode, activationToken } = activationDto;
    const newUser: { user: UserType; activationCode: string } =
      this.JwtService.verify(activationToken, {
        secret: this.configService.get<string>('ACTIVATION_TOKEN_SECRET'),
      } as JwtVerifyOptions) as { user: UserType; activationCode: string };
    if (newUser.activationCode !== activationCode) {
      throw new BadRequestException('Invalid activation code');
    }
    const { userName, email, password, phoneNumber } = newUser.user;
    const existUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existUser) {
      throw new BadRequestException('Email already exist');
    }
    const user = await this.prisma.user.create({
      data: {
        userName,
        email,
        password,
        phoneNumber,
      },
    });
    return { user, response };
  }

  // Login service
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (user && this.comparePassword(password, user.password)) {
      const tokenSender = new TokenSender(this.configService, this.JwtService);
      return tokenSender.sendToken(user);
    } else {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        error: {
          message: 'Invalid email or password',
        },
      };
    }
  }

  // Compare password service
  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Get Logged in user service
  async getLoggedInUser(req: any) {
    const user = req.user;
    const accessToken = req.accessToken;
    const refreshToken = req.refreshToken;
    return { user, accessToken, refreshToken };
  }

  // Logout service
  async logout(req: any) {
    if (req) {
      if (req.accessToken !== undefined) {
        req.accessToken = null;
      }
      if (req.refreshToken !== undefined) {
        req.refreshToken = null;
      }
      if (req.user !== undefined) {
        req.user = null;
      }
    }
    return { message: 'Logout successfully' };
  }

  // Get all user service
  async getAllUser() {
    return this.prisma.user.findMany({});
  }
}
