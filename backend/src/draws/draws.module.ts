import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Winner } from '../database/entities/winner.entity';
import { DrawsService } from './draws.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ParticipantsModule } from '../participants/participants.module';
import { XApiModule } from '../x-api/x-api.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Winner]),
    forwardRef(() => CampaignsModule),
    ParticipantsModule,
    XApiModule,
  ],
  providers: [DrawsService],
  exports: [DrawsService, TypeOrmModule],
})
export class DrawsModule {}
