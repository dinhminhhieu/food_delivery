import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    const accessToken = req.headers.accesstoken as string;
    const refreshToken = req.headers.refreshtoken as string;
    if (!accessToken || !refreshToken) {
      throw new UnauthorizedException('Please login to access this resource!');
    }
    try {
      const decoded = this.jwtService.verify(accessToken, {
        secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
      });
      if (!decoded) {
        throw new UnauthorizedException('Invalid access token');
      }

      await this.updateAccessToken(req);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async updateAccessToken(req: any): Promise<void> {
    try {
      const refreshTokenData = req.headers.refreshtoken as string;
      const decoded = this.jwtService.verify(refreshTokenData, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });

      if (!decoded) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const accessToken = this.jwtService.sign(
        { id: user.id },
        {
          secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
          expiresIn: '15m',
        },
      );

      const refreshToken = this.jwtService.sign(
        { id: user.id },
        {
          secret: this.configService.get('REFRESH_TOKEN_SECRET'),
          expiresIn: '7d',
        },
      );

      req.accessToken = accessToken;
      req.refreshToken = refreshToken;
      req.user = user;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Error updating access token');
    }
  }
}
