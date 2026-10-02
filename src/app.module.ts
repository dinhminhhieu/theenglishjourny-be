import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { TopicModule } from './modules/topic/topic.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { SkillModule } from './modules/skill/skill.module';
import { LevelModule } from './modules/level/level.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { CourseModule } from './modules/course/course.module';
import { PracticeModule } from './modules/practice/practice.module';
import { StorageModule } from './modules/storage/storage.module';
import { XpModule } from './modules/xp/xp.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TopicModule,
    VocabularyModule,
    SkillModule,
    LevelModule,
    GrammarModule,
    CourseModule,
    StorageModule,
    XpModule,
    PracticeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
