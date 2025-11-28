import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminSeed } from './seeds/admin.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: false, 
  }));
  
  app.enableCors();

  const adminSeed = app.get(AdminSeed);
  await adminSeed.seed();
  
  await app.listen(process.env.PORT ?? 3000);
  console.log('Application is running on: http://localhost:3000');
}

bootstrap();