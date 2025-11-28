import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../entities/user.entity';
import { RevokedToken } from '../../entities/revoked-token.entity';
import { UserService } from '../user/user.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, RevokedToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        console.log('JWT_SECRET:', configService.get<string>('JWT_SECRET'));
        return {
          secret: configService.get<string>('JWT_SECRET') || 'secretKey',
          signOptions: { expiresIn: '24h' },
        };
      },
      inject: [ConfigService],
    }),
     EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UserService],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {
  constructor() {
    console.log('AuthModule initialized');
  }
}