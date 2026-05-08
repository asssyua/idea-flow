import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SeedsModule } from './seeds/seed.module';
import { AdminModule } from './modules/admin/admin.module';
import { TopicModule } from './modules/topic/topic.module';
import { IdeaModule } from './modules/idea/idea.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const sslEnabled = configService.get('DB_SSL') === 'true' || configService.get('DB_SSL') === true;
        const isProduction = configService.get('NODE_ENV') === 'production';
        const synchronizeEnabled = !isProduction && (configService.get('DB_SYNCHRONIZE') === 'true' || configService.get('DB_SYNCHRONIZE') === true);
        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME', 'ideaflow_db'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: synchronizeEnabled,
          logging: false,
          ...(sslEnabled ? {
            ssl: true,
            extra: {
              ssl: {
                rejectUnauthorized: false,
              },
            },
          } : {}),
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    ProfileModule,
    SeedsModule,
    AdminModule,
    TopicModule,
    IdeaModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor() {}
  onModuleInit() {}
}