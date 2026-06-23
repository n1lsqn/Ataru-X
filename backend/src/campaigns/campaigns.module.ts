import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Campaign } from '../database/entities/campaign.entity';
import { CampaignCondition } from '../database/entities/campaign-condition.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsResolver } from './campaigns.resolver';
import { UsersModule } from '../users/users.module';
import { DrawsModule } from '../draws/draws.module';
import { ParticipantsModule } from '../participants/participants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignCondition]),
    BullModule.registerQueue({
      name: 'participant-fetch',
    }),
    UsersModule,
    DrawsModule,
    ParticipantsModule,
  ],
  providers: [CampaignsService, CampaignsResolver],
  controllers: [CampaignsController],
  exports: [CampaignsService, TypeOrmModule],
})
export class CampaignsModule {}
