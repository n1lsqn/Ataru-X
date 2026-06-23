import { Controller, Post, Get, Param, Body, Res } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as express from 'express';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UsersService } from '../users/users.service';
import { DrawsService } from '../draws/draws.service';
import { ParticipantsService } from '../participants/participants.service';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly usersService: UsersService,
    private readonly drawsService: DrawsService,
    private readonly participantsService: ParticipantsService,
    @InjectQueue('participant-fetch') private readonly fetchQueue: Queue,
  ) {}

  @Post()
  async create(@Body() dto: CreateCampaignDto) {
    const defaultOwner = await this.usersService.getFirstUser();
    return this.campaignsService.create(dto, defaultOwner);
  }

  @Get()
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/fetch')
  async fetchParticipants(@Param('id') id: string) {
    await this.campaignsService.findOne(id);
    const job = await this.fetchQueue.add('fetch', { campaignId: id });
    return {
      message: 'Participant fetch job queued successfully',
      jobId: job.id,
    };
  }

  @Post(':id/draw')
  async draw(@Param('id') id: string, @Body('seed') seed?: string) {
    return this.drawsService.draw(id, seed);
  }

  @Post(':id/redraw')
  async redraw(@Param('id') id: string) {
    return this.drawsService.redraw(id);
  }

  @Get(':id/export')
  async exportCsv(@Param('id') id: string, @Res() res: express.Response) {
    const campaign = await this.campaignsService.findOne(id);
    const participants = await this.participantsService.findByCampaignId(id);
    const winners = await this.drawsService.getWinnersByCampaignId(id);
    const winnerIds = new Set(winners.map((w) => w.userId));

    let csvContent = 'X User ID,Username,Display Name,Eligible,Is Winner,Condition Results\r\n';

    for (const p of participants) {
      const isWinner = winnerIds.has(p.userId) ? 'YES' : 'NO';
      const resultsStr = Object.entries(p.conditionsResult)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      
      const row = [
        p.userId,
        p.username,
        p.displayName,
        p.eligible ? 'YES' : 'NO',
        isWinner,
        `"${resultsStr}"`,
      ].join(',');
      
      csvContent += row + '\r\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaign-${campaign.id}-participants.csv`);
    return res.status(200).send(csvContent);
  }
}
