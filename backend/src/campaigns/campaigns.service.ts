import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from '../database/entities/campaign.entity';
import { CampaignCondition, ConditionType } from '../database/entities/campaign-condition.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { User } from '../database/entities/user.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignCondition)
    private readonly conditionRepository: Repository<CampaignCondition>,
  ) {}

  private extractTweetId(url: string): string {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : url;
  }

  async create(dto: CreateCampaignDto, owner: User): Promise<Campaign> {
    const tweetId = this.extractTweetId(dto.postUrl);

    const campaign = this.campaignRepository.create({
      title: dto.title,
      tweetId,
      winnerCount: dto.winnerCount,
      endAt: dto.endAt,
      ownerId: owner.id,
      status: CampaignStatus.ACTIVE,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    if (dto.conditions && dto.conditions.length > 0) {
      const conditions = dto.conditions.map((cond) => {
        const condition = new CampaignCondition();
        condition.campaignId = savedCampaign.id;
        condition.type = cond.type;
        condition.enabled = cond.enabled;
        condition.params = cond.paramsJson ? JSON.parse(cond.paramsJson) : undefined;
        return condition;
      });
      await this.conditionRepository.save(conditions);
    }

    return this.findOne(savedCampaign.id);
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepository.find({
      relations: {
        conditions: true,
        participants: true,
        winners: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: {
        conditions: true,
        participants: true,
        winners: true,
        owner: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async save(campaign: Campaign): Promise<Campaign> {
    return this.campaignRepository.save(campaign);
  }
}
