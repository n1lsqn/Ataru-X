import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ParticipantsModule } from './participants/participants.module';
import { DrawsModule } from './draws/draws.module';
import { EvaluatorsModule } from './evaluators/evaluators.module';
import { JobsModule } from './jobs/jobs.module';
import { XApiModule } from './x-api/x-api.module';

// Entities
import { User } from './database/entities/user.entity';
import { Campaign } from './database/entities/campaign.entity';
import { CampaignCondition } from './database/entities/campaign-condition.entity';
import { Participant } from './database/entities/participant.entity';
import { Winner } from './database/entities/winner.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5439),
        username: config.get<string>('DATABASE_USER', 'postgres'),
        password: config.get<string>('DATABASE_PASSWORD', 'postgrespassword'),
        database: config.get<string>('DATABASE_NAME', 'ataru_db'),
        entities: [User, Campaign, CampaignCondition, Participant, Winner],
        synchronize: true, // DEV ONLY
        logging: false,
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6389),
        },
      }),
    }),
    UsersModule,
    CampaignsModule,
    ParticipantsModule,
    DrawsModule,
    EvaluatorsModule,
    JobsModule,
    XApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
