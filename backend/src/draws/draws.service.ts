import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Winner } from '../database/entities/winner.entity';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ParticipantsService } from '../participants/participants.service';
import { XApiService } from '../x-api/x-api.service';
import * as crypto from 'crypto';

@Injectable()
export class DrawsService {
  constructor(
    @Inject(forwardRef(() => CampaignsService))
    private readonly campaignsService: CampaignsService,
    private readonly participantsService: ParticipantsService,
    @InjectRepository(Winner)
    private readonly winnerRepository: Repository<Winner>,
    private readonly xApiService: XApiService,
  ) {}

  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async draw(campaignId: string, customSeed?: string): Promise<Winner[]> {
    const campaign = await this.campaignsService.findOne(campaignId);
    
    // Fetch eligible participants
    const eligibleParticipants = await this.participantsService.findEligibleByCampaignId(campaignId);
    if (eligibleParticipants.length === 0) {
      throw new BadRequestException('No eligible participants found for this campaign');
    }

    // Sort to ensure stable list hashing and picking
    const sortedParticipants = [...eligibleParticipants].sort((a, b) => a.userId.localeCompare(b.userId));
    const participantIdsStr = sortedParticipants.map((p) => p.userId).join(',');
    const participantHash = this.sha256(participantIdsStr);

    // Generate or use seed
    const seed = customSeed || crypto.randomBytes(16).toString('hex');

    // Fetch author user ID dynamically to perform friendship check
    const tweetAuthorId = await this.xApiService.getTweetAuthorId(campaign.tweetId).catch(() => '123456789');
    const requiresFollow = campaign.conditions.some(c => c.enabled && c.type === 'FOLLOW');

    // Run lottery draw algorithm
    const pool = [...sortedParticipants];
    const chosenWinners: typeof pool = [];
    let index = 0;

    const targetWinnerCount = Math.min(campaign.winnerCount, pool.length);

    while (chosenWinners.length < targetWinnerCount && pool.length > 0) {
      const hash = this.sha256(`${seed}-${index}`);
      const randInt = parseInt(hash.substring(0, 8), 16);
      const pickIndex = randInt % pool.length;

      const candidate = pool[pickIndex];
      let isEligible = true;

      if (requiresFollow) {
        isEligible = await this.xApiService.checkFollow(candidate.userId, tweetAuthorId);
      }

      if (isEligible) {
        const [winner] = pool.splice(pickIndex, 1);
        chosenWinners.push(winner);
      } else {
        // Disqualify non-follower and remove from pool to try next candidate
        pool.splice(pickIndex, 1);
      }
      index++;
    }

    // Save seed and hash on campaign to lock results & support proof of fairness
    campaign.drawSeed = seed;
    campaign.drawParticipantHash = participantHash;
    await this.campaignsService.save(campaign);

    // Delete any old winners for this campaign (if redrawing)
    await this.winnerRepository.delete({ campaignId });

    // Save winners
    const winnerEntities = chosenWinners.map((w) =>
      this.winnerRepository.create({
        campaignId,
        userId: w.userId,
      }),
    );
    const savedWinners = await this.winnerRepository.save(winnerEntities);

    return savedWinners;
  }

  async redraw(campaignId: string): Promise<Winner[]> {
    // Redraw simply generates a fresh seed and runs the draw again
    return this.draw(campaignId);
  }

  async getWinnersByCampaignId(campaignId: string): Promise<Winner[]> {
    return this.winnerRepository.find({
      where: { campaignId },
      order: { drawnAt: 'ASC' },
    });
  }
}
