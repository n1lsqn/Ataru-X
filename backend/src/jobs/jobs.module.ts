import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ParticipantFetchProcessor } from './participant-fetch.processor';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ParticipantsModule } from '../participants/participants.module';
import { EvaluatorsModule } from '../evaluators/evaluators.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'participant-fetch',
    }),
    CampaignsModule,
    ParticipantsModule,
    EvaluatorsModule,
  ],
  providers: [ParticipantFetchProcessor],
  exports: [BullModule],
})
export class JobsModule {}
