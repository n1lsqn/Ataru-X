import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ParticipantsService } from '../participants/participants.service';
import { EvaluatorFactory } from '../evaluators/evaluator.factory';
import { Participant } from '../database/entities/participant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Processor('participant-fetch')
@Injectable()
export class ParticipantFetchProcessor extends WorkerHost {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly participantsService: ParticipantsService,
    private readonly evaluatorFactory: EvaluatorFactory,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
  ) {
    super();
  }

  async process(job: Job<{ campaignId: string }, any, string>): Promise<any> {
    const { campaignId } = job.data;
    const campaign = await this.campaignsService.findOne(campaignId);

    // Clear any previous participants for this campaign (simulating refresh)
    await this.participantsService.clearCampaignParticipants(campaignId);

    // Simulate fetching participants from X API
    // We will generate 100 mock participants
    const mockUsers = [
      { username: 'alice_dev', displayName: 'Alice In Tech', iconSeed: 'alice' },
      { username: 'bob_crypto', displayName: 'Bob Bitcoin', iconSeed: 'bob' },
      { username: 'charlie_ux', displayName: 'Charlie Design', iconSeed: 'charlie' },
      { username: 'diana_code', displayName: 'Diana Coder', iconSeed: 'diana' },
      { username: 'ethan_build', displayName: 'Ethan Builder', iconSeed: 'ethan' },
      { username: 'fiona_art', displayName: 'Fiona NFT', iconSeed: 'fiona' },
      { username: 'george_ai', displayName: 'George Artificial', iconSeed: 'george' },
      { username: 'hannah_dev', displayName: 'Hannah Stack', iconSeed: 'hannah' },
      { username: 'ian_sys', displayName: 'Ian Admin', iconSeed: 'ian' },
      { username: 'julia_web', displayName: 'Julia Frontend', iconSeed: 'julia' },
    ];

    // Generate up to 100 participants for realistic lists
    const participantsToSave: Participant[] = [];

    for (let i = 0; i < 80; i++) {
      const template = mockUsers[i % mockUsers.length];
      const suffix = i >= mockUsers.length ? Math.floor(i / mockUsers.length) : '';
      const xUserId = (100000000 + i).toString();
      const username = `${template.username}${suffix}`;
      const displayName = `${template.displayName} ${suffix}`.trim();
      const iconUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${template.iconSeed}${suffix}`;

      // Create dummy participant record to pass to evaluators
      const participant = new Participant();
      participant.campaignId = campaignId;
      participant.userId = xUserId;
      participant.username = username;
      participant.displayName = displayName;
      participant.iconUrl = iconUrl;
      participant.conditionsResult = {};
      participant.eligible = false;

      // Evaluate campaign conditions
      const evaluation = await this.evaluatorFactory.evaluateAll(campaign, participant);

      participant.conditionsResult = evaluation.results;
      participant.eligible = evaluation.eligible;

      participantsToSave.push(participant);
    }

    // Save all to database
    await this.participantsService.saveMany(participantsToSave);

    return {
      status: 'success',
      totalParticipants: participantsToSave.length,
      eligibleCount: participantsToSave.filter((p) => p.eligible).length,
    };
  }
}
