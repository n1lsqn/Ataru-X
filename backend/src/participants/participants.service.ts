import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../database/entities/participant.entity';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
  ) {}

  async findByCampaignId(campaignId: string): Promise<Participant[]> {
    return this.participantRepository.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
  }

  async findEligibleByCampaignId(campaignId: string): Promise<Participant[]> {
    return this.participantRepository.find({
      where: { campaignId, eligible: true },
    });
  }

  async saveMany(participants: Participant[]): Promise<Participant[]> {
    return this.participantRepository.save(participants);
  }

  async clearCampaignParticipants(campaignId: string): Promise<void> {
    await this.participantRepository.delete({ campaignId });
  }

  async countParticipants(campaignId: string) {
    const total = await this.participantRepository.count({ where: { campaignId } });
    const eligible = await this.participantRepository.count({ where: { campaignId, eligible: true } });
    return { total, eligible };
  }
}
